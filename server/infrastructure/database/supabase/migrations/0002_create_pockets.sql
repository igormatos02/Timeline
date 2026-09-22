-- ============================================================
-- Migration: 0002_create_pockets.sql
-- Creates pockets table and adds pocket_id to financial_events
-- ============================================================

CREATE TABLE IF NOT EXISTS pockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    initial_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    target_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    timeline_id UUID NOT NULL,
    timeboard_id UUID NOT NULL,
    date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_closed DATE,

    CONSTRAINT fk_pockets_timeline
        FOREIGN KEY (timeline_id)
        REFERENCES timelines(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pockets_timeboard
        FOREIGN KEY (timeboard_id)
        REFERENCES timeboards(id)
        ON DELETE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pockets' AND column_name = 'date_closed'
  ) THEN
    ALTER TABLE pockets ADD COLUMN date_closed DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pockets_timeline_id ON pockets(timeline_id);
CREATE INDEX IF NOT EXISTS idx_pockets_timeboard_id ON pockets(timeboard_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_events' AND column_name = 'pocket_id'
  ) THEN
    ALTER TABLE financial_events ADD COLUMN pocket_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_financial_events_pocket' AND table_name = 'financial_events'
  ) THEN
    ALTER TABLE financial_events
    ADD CONSTRAINT fk_financial_events_pocket
      FOREIGN KEY (pocket_id)
      REFERENCES pockets(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_events_pocket_id ON financial_events(pocket_id);
