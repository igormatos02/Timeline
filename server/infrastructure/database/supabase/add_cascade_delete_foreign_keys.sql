-- ==============================================================================
-- ADICIONAR CONSTRAINTS FOREIGN KEY COM CASCADE DELETE NAS TABELAS RELACIONADAS
-- ==============================================================================

-- 1. Tabela financial_events -> timelines (ON DELETE CASCADE)
ALTER TABLE financial_events
  DROP CONSTRAINT IF EXISTS fk_financial_events_timeline;

ALTER TABLE financial_events
  ADD CONSTRAINT fk_financial_events_timeline
  FOREIGN KEY (timeline_id)
  REFERENCES timelines (id)
  ON DELETE CASCADE;

-- 2. Tabela financial_event_status -> timelines (ON DELETE CASCADE)
ALTER TABLE financial_event_status
  DROP CONSTRAINT IF EXISTS fk_financial_event_status_timeline;

ALTER TABLE financial_event_status
  ADD CONSTRAINT fk_financial_event_status_timeline
  FOREIGN KEY (timeline_id)
  REFERENCES timelines (id)
  ON DELETE CASCADE;

-- 3. Tabela loan_contracts -> timelines (ON DELETE CASCADE)
ALTER TABLE loan_contracts
  DROP CONSTRAINT IF EXISTS fk_loan_contracts_timeline;

ALTER TABLE loan_contracts
  ADD CONSTRAINT fk_loan_contracts_timeline
  FOREIGN KEY (timeline_id)
  REFERENCES timelines (id)
  ON DELETE CASCADE;
