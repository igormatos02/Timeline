-- Stored Procedure SQL Supabase: get_income_timeline_metrics.sql
-- Retorna os dados agregados para o IncomeTimelineHeader (Header de Entradas)

DROP FUNCTION IF EXISTS get_income_timeline_metrics(UUID, DATE);

CREATE OR REPLACE FUNCTION get_income_timeline_metrics(
  p_timeline_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  current_month_income NUMERIC,
  current_month_expense NUMERIC,
  monthly_budget NUMERIC,
  income_commitment_percent NUMERIC,
  projected_amount_30 NUMERIC,
  projected_count_30 INT,
  received_amount_month NUMERIC,
  received_count_month INT,
  diff_previous_month_percent NUMERIC,
  is_diff_positive BOOLEAN,
  annual_projected_income NUMERIC,
  categories_breakdown JSONB,
  monthly_volume_history JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_curr_month_str TEXT;
  v_prev_month_str TEXT;
  v_next_30_date DATE;
  
  v_curr_inc NUMERIC := 0;
  v_curr_exp NUMERIC := 0;
  v_prev_inc NUMERIC := 0;
  v_proj_amt_30 NUMERIC := 0;
  v_proj_cnt_30 INT := 0;
  v_rec_amt_month NUMERIC := 0;
  v_rec_cnt_month INT := 0;
  
  v_diff_pct NUMERIC := 0.0;
  v_diff_pos BOOLEAN := TRUE;
  v_ann_proj NUMERIC := 0;
  
  v_categories_json JSONB := '[]'::JSONB;
  v_history_json JSONB := '[]'::JSONB;
BEGIN
  v_curr_month_str := TO_CHAR(p_reference_date, 'YYYY-MM');
  v_prev_month_str := TO_CHAR(p_reference_date - INTERVAL '1 month', 'YYYY-MM');
  v_next_30_date := p_reference_date + 30;

  -- 1. Total de Entradas do Mês Atual
  SELECT 
    COALESCE(SUM(e.amount), 0)
  INTO v_curr_inc
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND e.event_type = 'income'
    AND TO_CHAR(e.date, 'YYYY-MM') = v_curr_month_str
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 2. Total de Entradas do Mês Anterior
  SELECT 
    COALESCE(SUM(e.amount), 0)
  INTO v_prev_inc
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND e.event_type = 'income'
    AND TO_CHAR(e.date, 'YYYY-MM') = v_prev_month_str
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 3. Previstos nos Próximos 30 Dias & Já Recebidos no Mês
  SELECT 
    COALESCE(SUM(CASE WHEN e.date >= p_reference_date AND e.date <= v_next_30_date THEN e.amount ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE e.date >= p_reference_date AND e.date <= v_next_30_date),
    COALESCE(SUM(CASE WHEN TO_CHAR(e.date, 'YYYY-MM') = v_curr_month_str AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received', 'pago', 'liquidado', 'recebido') THEN e.amount ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE TO_CHAR(e.date, 'YYYY-MM') = v_curr_month_str AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received', 'pago', 'liquidado', 'recebido'))
  INTO v_proj_amt_30, v_proj_cnt_30, v_rec_amt_month, v_rec_cnt_month
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND e.event_type = 'income'
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 4. Breakdown por Categoria (Lê estritamente a coluna e.category verificando os valores do enum IncomeEventCategory)
  WITH cat_totals AS (
    SELECT 
      CASE 
        WHEN LOWER(e.category) IN ('salary', 'meal_allowance', 'bonus', 'freelance', 'investment_return', 'recurring_income', 'other') THEN LOWER(e.category)
        ELSE 'other'
      END AS cat_name,
      SUM(e.amount) AS total_amt
    FROM financial_events e
    LEFT JOIN financial_event_status fs 
      ON fs.event_id = e.event_id 
     AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
     AND fs.month = EXTRACT(MONTH FROM e.date)::INT
    WHERE e.timeline_id = p_timeline_id
      AND e.event_type = 'income'
      AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    GROUP BY 1
  ),
  total_sum AS (
    SELECT COALESCE(SUM(total_amt), 1) AS grand_total FROM cat_totals
  )
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'category', c.cat_name,
      'amount', c.total_amt,
      'percent', CASE WHEN t.grand_total > 0 THEN ROUND((c.total_amt / t.grand_total) * 100, 1) ELSE 0 END
    ) ORDER BY c.total_amt DESC
  )
  INTO v_categories_json
  FROM cat_totals c, total_sum t;

  IF v_categories_json IS NULL THEN
    v_categories_json := '[]'::JSONB;
  END IF;

  -- 5. Histórico de Volume Mensal de Entradas (Últimos 6 Meses + Mês Atual)
  WITH months_series AS (
    SELECT 
      TO_CHAR((p_reference_date - (i || ' month')::INTERVAL), 'YYYY-MM') AS month_key,
      (p_reference_date - (i || ' month')::INTERVAL)::DATE AS month_date,
      i AS month_offset
    FROM generate_series(6, 0, -1) AS i
  ),
  monthly_sums AS (
    SELECT 
      m.month_key,
      m.month_date,
      m.month_offset,
      COALESCE(SUM(e.amount), 0) AS total_amount
    FROM months_series m
    LEFT JOIN financial_events e 
      ON e.timeline_id = p_timeline_id
     AND TO_CHAR(e.date, 'YYYY-MM') = m.month_key
     AND e.event_type = 'income'
    LEFT JOIN financial_event_status fs 
      ON fs.event_id = e.event_id 
     AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
     AND fs.month = EXTRACT(MONTH FROM e.date)::INT
     AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    GROUP BY m.month_key, m.month_date, m.month_offset
  )
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'key', ms.month_key,
      'label', TO_CHAR(ms.month_date, 'Mon'),
      'total', ms.total_amount
    ) ORDER BY ms.month_offset DESC
  )
  INTO v_history_json
  FROM monthly_sums ms;

  IF v_history_json IS NULL THEN
    v_history_json := '[]'::JSONB;
  END IF;

  -- 6. Cálculos Derivados Globais
  IF v_prev_inc > 0 THEN
    v_diff_pct := ROUND(((v_curr_inc - v_prev_inc) / v_prev_inc) * 100, 1);
    v_diff_pos := v_diff_pct >= 0;
  ELSIF v_curr_inc > 0 THEN
    v_diff_pct := 100.0;
    v_diff_pos := TRUE;
  ELSE
    v_diff_pct := 0.0;
    v_diff_pos := TRUE;
  END IF;

  v_ann_proj := ROUND(v_curr_inc * 12, 2);

  RETURN QUERY SELECT 
    v_curr_inc,
    v_curr_exp,
    3000.00::NUMERIC, -- Alvo orçamental mensal padrão de receitas
    100.00::NUMERIC,
    v_proj_amt_30,
    v_proj_cnt_30,
    v_rec_amt_month,
    v_rec_cnt_month,
    v_diff_pct,
    v_diff_pos,
    v_ann_proj,
    v_categories_json,
    v_history_json;
END;
$$;
