-- ==============================================================================
-- STORED PROCEDURE SQL SUPABASE: get_balance_timeline_metrics.sql
-- Computa o Balanço Atual acumulado (desde a data inicial p_start_date até a data atual p_reference_date)
-- Parametros: p_timeboard_id, p_timeline_id, p_start_date, p_reference_date
-- ==============================================================================

DROP FUNCTION IF EXISTS get_balance_timeline_metrics(UUID, UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_balance_timeline_metrics(
  p_timeboard_id UUID DEFAULT NULL,
  p_timeline_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT '1900-01-01',
  p_reference_date DATE DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
)
RETURNS TABLE (
  net_realized NUMERIC,              -- Saldo Líquido Acumulado (+0,00 €)
  total_received NUMERIC,            -- Entradas (+0 €)
  total_paid_expenses NUMERIC,       -- Saídas (-0 €)
  total_invested NUMERIC,            -- Investido (-0 €)
  total_remaining_debt NUMERIC,      -- Devido (0 €)
  
  investments_breakdown JSONB,       -- Breakdowns de Investimentos [{ category, amount, percent }]
  investments_total_accumulated NUMERIC, -- Total Acumulado em Investimentos (0,00 €)
  
  loans_breakdown JSONB,             -- Breakdowns de Financiamentos [{ name, amount, percent }]
  total_amortized NUMERIC,           -- Capital Amortizado (0,00 €)
  total_loan_debt NUMERIC            -- Capital Devido (0,00 €)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_ref_date DATE;
  v_net_realized NUMERIC := 0;
  v_total_received NUMERIC := 0;
  v_total_paid_expenses NUMERIC := 0;
  v_total_invested NUMERIC := 0;
  v_total_remaining_debt NUMERIC := 0;
  
  v_investments_json JSONB := '[]'::JSONB;
  v_inv_total_accumulated NUMERIC := 0;
  
  v_loans_json JSONB := '[]'::JSONB;
  v_total_amortized NUMERIC := 0;
  v_total_loan_debt NUMERIC := 0;
BEGIN
  -- Garantir que a data de referência considerada seja o último dia do mês
  v_ref_date := (DATE_TRUNC('month', COALESCE(p_reference_date, CURRENT_DATE)) + INTERVAL '1 month - 1 day')::DATE;
  -- 1. BALANÇO ATUAL (Entradas, Saídas, Investido entre p_start_date e p_reference_date)
  SELECT 
    COALESCE(SUM(CASE WHEN e.event_type = 'income' AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received') THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'expense' AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received') THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.event_type = 'investment' AND LOWER(COALESCE(fs.status, 'pending')) IN ('paid', 'settled', 'completed', 'received') THEN e.amount ELSE 0 END), 0)
  INTO v_total_received, v_total_paid_expenses, v_total_invested
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
    AND e.date >= p_start_date
    AND e.date <= v_ref_date
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  v_net_realized := v_total_received - v_total_paid_expenses - v_total_invested;

  -- 2. INVESTIMENTOS (Breakdown por Categoria estrita e Total Acumulado)
  WITH inv_totals AS (
    SELECT 
      CASE 
        WHEN LOWER(e.category) IN ('savings', 'assets', 'stocks', 'funds', 'crypto', 'real_estate', 'other') THEN LOWER(e.category)
        ELSE 'other'
      END AS cat_name,
      SUM(e.amount) AS total_amt
    FROM financial_events e
    LEFT JOIN financial_event_status fs 
      ON fs.event_id = e.event_id 
     AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
     AND fs.month = EXTRACT(MONTH FROM e.date)::INT
    WHERE (p_timeboard_id IS NULL OR e.timeboard_id = p_timeboard_id)
      AND e.event_type = 'investment'
      AND e.date >= p_start_date
      AND e.date <= v_ref_date
      AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    GROUP BY 1
  ),
  inv_sum AS (
    SELECT COALESCE(SUM(total_amt), 0) AS grand_total FROM inv_totals
  )
  SELECT 
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'category', i.cat_name,
          'amount', i.total_amt,
          'percent', CASE WHEN s.grand_total > 0 THEN ROUND((i.total_amt / s.grand_total) * 100, 1) ELSE 0 END
        ) ORDER BY i.total_amt DESC
      ), '[]'::JSONB
    ),
    s.grand_total
  INTO v_investments_json, v_inv_total_accumulated
  FROM inv_totals i, inv_sum s
  GROUP BY s.grand_total;

  IF v_investments_json IS NULL THEN
    v_investments_json := '[]'::JSONB;
  END IF;

  -- 3. EMPRÉSTIMOS E FINANCIAMENTOS (Breakdown por Financiamento, Capital Amortizado e Capital Devido)
  -- Capital Amortizado = SUM(principal_amount de parcelas pagas) + SUM(amount de amortizações pagas)
  v_total_amortized := (
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
      AND e.date <= v_ref_date
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
      AND e.date <= v_ref_date
      AND (
        fs.status IS NULL 
        OR LOWER(fs.status) NOT IN ('cancelled', 'deleted')
      )
  );

  -- Capital Devido por Timeline de Empréstimo = soma de (amount - principal_amount) para parcelas não pagas / futuras
  WITH loan_debts AS (
    SELECT 
      t.id AS t_id,
      t.name AS t_name,
      COALESCE(SUM(
        CASE 
          WHEN e.date > v_ref_date OR LOWER(COALESCE(fs.status, 'pending')) NOT IN ('paid', 'settled', 'completed', 'received', 'amortized', 'cancelled', 'deleted') THEN
            CASE
              WHEN e.event_type = 'loan_installment' THEN COALESCE(e.amount, 0) - COALESCE(e.principal_amount, 0)
              ELSE 0
            END
          ELSE 0
        END
      ), 0) AS rem_debt
    FROM timelines t
    LEFT JOIN financial_events e ON e.timeline_id = t.id
    LEFT JOIN financial_event_status fs 
      ON fs.event_id = e.event_id 
     AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
     AND fs.month = EXTRACT(MONTH FROM e.date)::INT
    WHERE (p_timeboard_id IS NULL OR t.timeboard_id = p_timeboard_id)
      AND LOWER(t.type) = 'loan'
      AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted')
    GROUP BY t.id, t.name
  ),
  debt_sum AS (
    SELECT COALESCE(SUM(rem_debt), 0) AS total_debt FROM loan_debts
  )
  SELECT 
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', ld.t_id,
          'name', ld.t_name,
          'amount', ld.rem_debt,
          'percent', CASE WHEN ds.total_debt > 0 THEN ROUND((ld.rem_debt / ds.total_debt) * 100, 1) ELSE 0 END
        ) ORDER BY ld.rem_debt DESC
      ), '[]'::JSONB
    ),
    ds.total_debt
  INTO v_loans_json, v_total_loan_debt
  FROM loan_debts ld, debt_sum ds
  GROUP BY ds.total_debt;

  IF v_loans_json IS NULL THEN
    v_loans_json := '[]'::JSONB;
  END IF;

  v_total_remaining_debt := v_total_loan_debt;

  RETURN QUERY SELECT 
    v_net_realized,
    v_total_received,
    v_total_paid_expenses,
    v_total_invested,
    v_total_remaining_debt,
    v_investments_json,
    v_inv_total_accumulated,
    v_loans_json,
    v_total_amortized,
    v_total_loan_debt;
END;
$func$;
