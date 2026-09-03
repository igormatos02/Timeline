-- ==============================================================================
-- STORED PROCEDURE / FUNCTION SQL: get_loan_timeline_metrics
-- Agregação e Mapeamento Direto das Parcelas do Empréstimo
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_loan_timeline_metrics(
  p_timeline_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_debt NUMERIC,                -- Capital Original Financiado
  remaining_debt NUMERIC,            -- Saldo Devedor Atual
  amortized_capital NUMERIC,         -- Capital Amortizado até ao momento
  amortized_percent NUMERIC,         -- % do Capital Amortizado

  total_installments INT,            -- Total de Parcelas do Contrato
  paid_installments INT,             -- Parcelas já Pagas / Abatidas
  remaining_installments INT,        -- Parcelas Restantes

  current_installment_amount NUMERIC,-- Valor Médio / Atual da Prestação
  next_due_date DATE,                -- Próximo Vencimento
  estimated_payoff_date DATE,        -- Data de Quitação Prevista

  future_capital NUMERIC,            -- Capital Ainda Devido no Futuro
  future_interest NUMERIC,           -- Juros Futuros
  future_total NUMERIC,              -- Total Futuro a Pagar (Capital + Juros)
  future_capital_percent NUMERIC,    -- % Capital no Futuro
  future_interest_percent NUMERIC,   -- % Juros no Futuro

  paid_capital NUMERIC,              -- Capital Já Amortizado
  paid_interest NUMERIC,             -- Juros Já Pagos
  paid_total NUMERIC,                -- Total Já Pago (Capital + Juros)

  original_capital NUMERIC,          -- Capital Original
  total_estimated_interest NUMERIC,  -- Juros Totais Estimados
  total_loan_cost NUMERIC            -- Custo Total do Empréstimo
) AS $$
DECLARE
  v_orig_capital NUMERIC := 0;
  v_total_inst INT := 0;
  v_paid_inst INT := 0;
  v_paid_cap NUMERIC := 0;
  v_paid_int NUMERIC := 0;
  v_fut_cap NUMERIC := 0;
  v_fut_int NUMERIC := 0;
  v_curr_inst NUMERIC := 0;
  v_next_due DATE;
  v_payoff_date DATE;
  v_rem_debt NUMERIC := 0;
  v_amort_pct NUMERIC := 0;
  v_fut_tot NUMERIC := 0;
  v_fut_cap_pct NUMERIC := 0;
  v_fut_int_pct NUMERIC := 0;
  v_paid_tot NUMERIC := 0;
  v_tot_int NUMERIC := 0;
  v_tot_cost NUMERIC := 0;
  v_tot_amount NUMERIC := 0;
  v_tot_principal NUMERIC := 0;
BEGIN
  -- 1. Obter informações de total_installments e datas extremas
  SELECT 
    COALESCE(MAX(e.total_installments), COUNT(*)),
    COALESCE(
      MIN(e.date) FILTER (
        WHERE e.date >= p_reference_date 
          AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('paid', 'received', 'settled', 'amortized', 'completed', 'pago', 'liquidado', 'abatida')
      ), 
      MAX(e.date)
    ),
    COALESCE(MAX(e.date), p_reference_date),
    COALESCE(SUM(e.amount), 0),
    COALESCE(SUM(e.principal_amount), 0)
  INTO v_total_inst, v_next_due, v_payoff_date, v_tot_amount, v_tot_principal
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND (e.event_type IN ('loan_installment', 'amortization') OR e.category IN ('parcela_emprestimo', 'amortizacao'))
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  IF v_total_inst = 0 THEN
    v_total_inst := 1;
  END IF;

  v_curr_inst := ROUND(v_tot_amount / v_total_inst, 2);

  -- 2. Agregação de valores PAGOS / AMORTIZADOS
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(e.principal_amount, 0) > 0 THEN e.principal_amount 
        ELSE e.amount * 0.82 
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(e.principal_amount, 0) > 0 THEN GREATEST(0, e.amount - e.principal_amount)
        ELSE e.amount * 0.18 
      END
    ), 0),
    COUNT(*)
  INTO v_paid_cap, v_paid_int, v_paid_inst
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND (e.event_type IN ('loan_installment', 'amortization') OR e.category IN ('parcela_emprestimo', 'amortizacao'))
    AND (LOWER(fs.status) IN ('paid', 'received', 'settled', 'amortized', 'completed', 'pago', 'liquidado', 'abatida') OR e.date < p_reference_date)
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('cancelled', 'deleted');

  -- 3. Agregação de valores FUTUROS / PENDENTES
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(e.principal_amount, 0) > 0 THEN e.principal_amount 
        ELSE e.amount * 0.82 
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(e.principal_amount, 0) > 0 THEN GREATEST(0, e.amount - e.principal_amount)
        ELSE e.amount * 0.18 
      END
    ), 0)
  INTO v_fut_cap, v_fut_int
  FROM financial_events e
  LEFT JOIN financial_event_status fs 
    ON fs.event_id = e.event_id 
   AND fs.year = EXTRACT(YEAR FROM e.date)::INT 
   AND fs.month = EXTRACT(MONTH FROM e.date)::INT
  WHERE e.timeline_id = p_timeline_id
    AND (e.event_type IN ('loan_installment', 'amortization') OR e.category IN ('parcela_emprestimo', 'amortizacao'))
    AND LOWER(COALESCE(fs.status, 'pending')) NOT IN ('paid', 'received', 'settled', 'amortized', 'completed', 'pago', 'liquidado', 'abatida', 'cancelled', 'deleted')
    AND e.date >= p_reference_date;

  -- 4. Cálculos Derivados
  v_orig_capital := v_paid_cap + v_fut_cap;
  IF v_orig_capital = 0 THEN
    v_orig_capital := v_tot_principal;
  END IF;

  v_rem_debt := v_fut_cap;
  IF v_orig_capital > 0 THEN
    v_amort_pct := ROUND((v_paid_cap / v_orig_capital) * 100, 2);
  ELSE
    v_amort_pct := 0;
  END IF;

  v_fut_tot := v_fut_cap + v_fut_int;
  IF v_fut_tot > 0 THEN
    v_fut_cap_pct := ROUND((v_fut_cap / v_fut_tot) * 100, 2);
    v_fut_int_pct := ROUND((v_fut_int / v_fut_tot) * 100, 2);
  ELSE
    v_fut_cap_pct := 0;
    v_fut_int_pct := 0;
  END IF;

  v_paid_tot := v_paid_cap + v_paid_int;
  v_tot_int := v_paid_int + v_fut_int;
  v_tot_cost := v_orig_capital + v_tot_int;

  -- Retorno do Registro
  RETURN QUERY SELECT 
    v_orig_capital AS total_debt,
    v_rem_debt AS remaining_debt,
    v_paid_cap AS amortized_capital,
    v_amort_pct AS amortized_percent,

    COALESCE(v_total_inst, 0) AS total_installments,
    COALESCE(v_paid_inst, 0) AS paid_installments,
    GREATEST(0, COALESCE(v_total_inst, 0) - COALESCE(v_paid_inst, 0)) AS remaining_installments,

    v_curr_inst AS current_installment_amount,
    v_next_due AS next_due_date,
    v_payoff_date AS estimated_payoff_date,

    v_fut_cap AS future_capital,
    v_fut_int AS future_interest,
    v_fut_tot AS future_total,
    v_fut_cap_pct AS future_capital_percent,
    v_fut_int_pct AS future_interest_percent,

    v_paid_cap AS paid_capital,
    v_paid_int AS paid_interest,
    v_paid_tot AS paid_total,

    v_orig_capital AS original_capital,
    v_tot_int AS total_estimated_interest,
    v_tot_cost AS total_loan_cost;
END;
$$ LANGUAGE plpgsql STABLE;
