-- Migration: Add is_obligation and obligation_person_id to financial_events table

ALTER TABLE financial_events
  ADD COLUMN IF NOT EXISTS is_obligation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS obligation_person_id UUID NULL REFERENCES persons(id) ON DELETE SET NULL;

-- Index for fast querying and joins with persons table
CREATE INDEX IF NOT EXISTS idx_financial_events_obligation_person_id 
  ON financial_events(obligation_person_id);

-- Optional: Index on is_obligation for filtering obligations
CREATE INDEX IF NOT EXISTS idx_financial_events_is_obligation 
  ON financial_events(is_obligation);
