-- ==============================================================================
-- STORED PROCEDURE / FUNCTION SQL: get_expense_timeline_metrics
-- Agregação e Mapeamento Direto do Cabeçalho de Gastos / Despesas
-- ==============================================================================

DROP FUNCTION IF EXISTS get_expense_timeline_metrics(UUID, DATE);

CREATE OR REPLACE FUNCTION get_expense_timeline_metrics(
  p_timeline_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  current_month_expense NUMERIC,       -- Total de Gastos do Mês Atual
  current_month_income NUMERIC,        -- Total de Entradas do Mês Atual
  monthly_budget NUMERIC,              -- Orçamento Mensal de Referência
  income_commitment_percent NUMERIC,   -- % Comprometido das Entradas

  committed_amount_30 NUMERIC,         -- Comprometido nos Próximos 30 Dias
  committed_count_30 INT,              -- Qtd de Pagamentos nos Próximos 30 Dias
  paid_amount_month NUMERIC,           -- Gastos Já Pagos no Mês Atual
  paid_count_month INT,                -- Qtd de Pagamentos Já Efetuados no Mês
  paid_percent_month NUMERIC,          -- % de Pagamentos Já Efetuados no Mês

  diff_previous_month_percent NUMERIC, -- % Este Mês vs Mês Anterior
  is_diff_negative BOOLEAN,            -- Se a Variação foi Redução (Negativo = Bom)
  annual_projected_expense NUMERIC,    -- Projeção Anual de Gastos

  categories_breakdown JSONB,          -- Breakdown por Categoria [{ category, amount, percent }]
  monthly_volume_history JSONB          -- Histórico de Volume (Últimos 6 Meses + Atual) [{ key, label, total }]
) AS $$
DECLARE
  v_curr_month_str TEXT := TO_CHAR(p_reference_date, 'YYYY-MM');
  v_prev_month_date DATE := (p_reference_date - INTERVAL '1 month')::DATE;
  v_prev_month_str TEXT := TO_CHAR(v_prev_month_date, 'YYYY-MM');
  v_next_30_date DATE := p_reference_date + INTERVAL '30 days';

  v_curr_exp NUMERIC := 0;
  v_curr_inc NUMERIC := 0;
  v_prev_exp NUMERIC := 0;

  v_comm_amt NUMERIC := 0;
  v_comm_cnt INT := 0;
  v_paid_amt NUMERIC := 0;
  v_paid_cnt INT := 0;

  v_income_target NUMERIC := 0;
  v_income_pct NUMERIC := 0;
  v_paid_pct NUMERIC := 0;
  v_diff_pct NUMERIC := 0;
  v_diff_neg BOOLEAN := FALSE;
  v_ann_proj NUMERIC := 0;

  v_categories_json JSONB := '[]'::JSONB;
  v_history_json JSONB := '[]'::JSONB;
BEGIN
  -- 1. Total de Gastos e Entradas do Mês Atual (Estritamente event_type = 'expense' e event_type = 'income')
  SELECT 
    COALESCE(SUM(CASE WHEN e.event_type = 'expense' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'income' THEN e.amount ELSE 0 END), 0)
  INTO v_curr_exp, v_curr_inc
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND TO_CHAR(e.date, 'YYYY-MM') = v_curr_month_str
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 2. Total de Gastos do Mês Anterior (para comparação)
  SELECT 
    COALESCE(SUM(e.amount), 0)
  INTO v_prev_exp
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND e.event_type = 'expense'
    AND TO_CHAR(e.date, 'YYYY-MM') = v_prev_month_str
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 3. Comprometido nos Próximos 30 Dias & Já Pagos no Mês
  SELECT 
    COALESCE(SUM(CASE WHEN e.date >= p_reference_date AND e.date <= v_next_30_date THEN e.amount ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE e.date >= p_reference_date AND e.date <= v_next_30_date),
    COALESCE(SUM(CASE WHEN TO_CHAR(e.date, 'YYYY-MM') = v_curr_month_str AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received', 'pago', 'liquidado') THEN e.amount ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE TO_CHAR(e.date, 'YYYY-MM') = v_curr_month_str AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received', 'pago', 'liquidado'))
  INTO v_comm_amt, v_comm_cnt, v_paid_amt, v_paid_cnt
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND e.event_type = 'expense'
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 4. Breakdown por Categoria (Lê estritamente a coluna e.category verificando os valores do enum ExpensesEventCategory)
  WITH cat_totals AS (
    SELECT 
      CASE 
        WHEN LOWER(e.category) IN (
          'electricity', 'water', 'gas', 'communications', 'rent', 'health', 
          'food', 'transportation', 'education', 'entertainment', 'personal_care', 
          'shopping', 'carmaintenance', 'housemaintenance', 'ensurance', 'pets', 
          'travel', 'clothing', 'other'
        ) THEN LOWER(e.category)
        ELSE 'other'
      END AS cat_name,
      SUM(e.amount) AS total_amt
    FROM financial_events e
    LEFT JOIN financial_event_status fs 
      ON fs.event_id = e.event_id 
     AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
     AND fs.month = EXTRACT(MONTH FROM e.date)::INT
    WHERE e.timeline_id = p_timeline_id
      AND e.event_type = 'expense'
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

  -- 5. Histórico de Volume Mensal de Despesas (Últimos 6 Meses + Mês Atual)
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
      CASE 
        WHEN m.month_key = v_curr_month_str AND COALESCE(SUM(e.amount), 0) = 0 THEN v_comm_amt
        ELSE COALESCE(SUM(e.amount), 0)
      END AS total_amount
    FROM months_series m
    LEFT JOIN financial_events e 
      ON e.timeline_id = p_timeline_id
     AND TO_CHAR(e.date, 'YYYY-MM') = m.month_key
     AND e.event_type = 'expense'
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
  v_income_target := GREATEST(v_curr_inc, 1500);
  v_income_pct := LEAST(100, ROUND((v_curr_exp / v_income_target) * 100, 1));

  IF v_curr_exp > 0 THEN
    v_paid_pct := LEAST(100, ROUND((v_paid_amt / v_curr_exp) * 100, 1));
  ELSE
    v_paid_pct := 0;
  END IF;

  IF v_prev_exp > 0 THEN
    v_diff_pct := ROUND(((v_curr_exp - v_prev_exp) / v_prev_exp) * 100, 1);
    v_diff_neg := v_diff_pct <= 0;
  ELSIF v_curr_exp > 0 THEN
    v_diff_pct := 100.0;
    v_diff_neg := FALSE;
  ELSE
    v_diff_pct := 0.0;
    v_diff_neg := TRUE;
  END IF;

  v_ann_proj := ROUND(v_curr_exp * 12, 2);

  RETURN QUERY SELECT 
    v_curr_exp,
    v_curr_inc,
    v_income_target,
    v_income_pct,
    v_comm_amt,
    v_comm_cnt,
    v_paid_amt,
    v_paid_cnt,
    v_paid_pct,
    v_diff_pct,
    v_diff_neg,
    v_ann_proj,
    v_categories_json,
    v_history_json;
END;
$$ LANGUAGE plpgsql STABLE;
