-- ==============================================================================
-- STORED PROCEDURE SQL SUPABASE: get_balance_projected_timeline_metrics.sql
-- Computa todos os meses projetados de p_start_date até +10 anos (120 meses) numa única chamada
-- Retorna array/tabela de objetos mensais com Balanço Projetado, Entradas, Saídas, Investimentos, Capital Amortizado
-- ==============================================================================

DROP FUNCTION IF EXISTS get_balance_projected_timeline_metrics(UUID, UUID, DATE, INT);

CREATE OR REPLACE FUNCTION get_balance_projected_timeline_metrics(
  p_timeboard_id UUID DEFAULT NULL,
  p_timeline_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_months_ahead INT DEFAULT 120
)
RETURNS TABLE (
  month_key TEXT,
  month_label TEXT,
  months_offset INT,
  net_projected NUMERIC,
  forecast_income NUMERIC,
  planned_expenses NUMERIC,
  planned_investments NUMERIC,
  planned_amortization NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN QUERY
  WITH months_series AS (
    SELECT 
      i AS offset_val,
      TO_CHAR((p_start_date + (i || ' month')::INTERVAL), 'YYYY-MM') AS m_key,
      TO_CHAR((p_start_date + (i || ' month')::INTERVAL), 'Mon YYYY') AS m_label,
      ((p_start_date + (i || ' month')::INTERVAL) + INTERVAL '1 month - 1 day')::DATE AS month_date
    FROM generate_series(0, p_months_ahead) AS i
  )
  SELECT 
    ms.m_key AS month_key,
    ms.m_label AS month_label,
    ms.offset_val AS months_offset,

    -- net_projected = inc - exp - inv
    ROUND(
      COALESCE((
        SELECT SUM(e.amount)
        FROM financial_events e
        LEFT JOIN financial_event_status fs ON fs.event_id = e.event_id AND fs.year = EXTRACT(YEAR FROM e.date)::INT AND fs.month = EXTRACT(MONTH FROM e.date)::INT
        WHERE e.event_type = 'income' AND e.date <= ms.month_date
          AND (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
          AND (p_timeline_id IS NULL OR e.timeline_id = p_timeline_id)
          AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
      ), 0)
      -
      COALESCE((
        SELECT SUM(e.amount)
        FROM financial_events e
        LEFT JOIN financial_event_status fs ON fs.event_id = e.event_id AND fs.year = EXTRACT(YEAR FROM e.date)::INT AND fs.month = EXTRACT(MONTH FROM e.date)::INT
        WHERE e.event_type = 'expense' AND e.date <= ms.month_date
          AND (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
          AND (p_timeline_id IS NULL OR e.timeline_id = p_timeline_id)
          AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
      ), 0)
      -
      COALESCE((
        SELECT SUM(e.amount)
        FROM financial_events e
        LEFT JOIN financial_event_status fs ON fs.event_id = e.event_id AND fs.year = EXTRACT(YEAR FROM e.date)::INT AND fs.month = EXTRACT(MONTH FROM e.date)::INT
        WHERE e.event_type = 'investment' AND e.date <= ms.month_date
          AND (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
          AND (p_timeline_id IS NULL OR e.timeline_id = p_timeline_id)
          AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
      ), 0), 2
    ) AS net_projected,

    -- forecast_income
    ROUND(COALESCE((
      SELECT SUM(e.amount)
      FROM financial_events e
      LEFT JOIN financial_event_status fs ON fs.event_id = e.event_id AND fs.year = EXTRACT(YEAR FROM e.date)::INT AND fs.month = EXTRACT(MONTH FROM e.date)::INT
      WHERE e.event_type = 'income' AND e.date <= ms.month_date
        AND (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
        AND (p_timeline_id IS NULL OR e.timeline_id = p_timeline_id)
        AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    ), 0), 2) AS forecast_income,

    -- planned_expenses
    ROUND(COALESCE((
      SELECT SUM(e.amount)
      FROM financial_events e
      LEFT JOIN financial_event_status fs ON fs.event_id = e.event_id AND fs.year = EXTRACT(YEAR FROM e.date)::INT AND fs.month = EXTRACT(MONTH FROM e.date)::INT
      WHERE e.event_type = 'expense' AND e.date <= ms.month_date
        AND (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
        AND (p_timeline_id IS NULL OR e.timeline_id = p_timeline_id)
        AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    ), 0), 2) AS planned_expenses,

    -- planned_investments
    ROUND(COALESCE((
      SELECT SUM(e.amount)
      FROM financial_events e
      LEFT JOIN financial_event_status fs ON fs.event_id = e.event_id AND fs.year = EXTRACT(YEAR FROM e.date)::INT AND fs.month = EXTRACT(MONTH FROM e.date)::INT
      WHERE e.event_type = 'investment' AND e.date <= ms.month_date
        AND (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
        AND (p_timeline_id IS NULL OR e.timeline_id = p_timeline_id)
        AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    ), 0), 2) AS planned_investments,

    -- planned_amortization
    ROUND(
      (
        SELECT COALESCE(
          SUM(COALESCE(e.principal_amount, 0)),
          0
        )
        FROM financial_events e
        LEFT JOIN financial_event_status fs
          ON fs.event_id = e.event_id
         AND fs.year = EXTRACT(YEAR FROM e.date)::INT
         AND fs.month = EXTRACT(MONTH FROM e.date)::INT
        WHERE (LOWER(COALESCE(e.event_type, '')) = 'loan_installment' OR LOWER(COALESCE(e.category, '')) IN ('loan_installment', 'parcela_emprestimo'))
          AND e.date <= ms.month_date
          AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received', 'amortized')
      )
      +
      (
        SELECT COALESCE(
          SUM(COALESCE(e.amount, 0)),
          0
        )
        FROM financial_events e
        LEFT JOIN financial_event_status fs
          ON fs.event_id = e.event_id
         AND fs.year = EXTRACT(YEAR FROM e.date)::INT
         AND fs.month = EXTRACT(MONTH FROM e.date)::INT
        WHERE (LOWER(COALESCE(e.event_type, '')) = 'amortization' OR LOWER(COALESCE(e.category, '')) IN ('amortization', 'amortizacao', 'extraordinary_amortization'))
          AND e.date <= ms.month_date
          AND (
            fs.status IS NULL 
            OR LOWER(fs.status) NOT IN ('cancelled', 'deleted')
          )
      ), 2
    ) AS planned_amortization

  FROM months_series ms
  ORDER BY ms.offset_val ASC;
END;
$func$;
