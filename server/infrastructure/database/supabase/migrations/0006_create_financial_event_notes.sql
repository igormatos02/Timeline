-- ============================================================
-- Migration: 0006_create_financial_event_notes.sql
-- Event comments are stored per occurrence (year / month), like financial_event_status,
-- so a comment on one month of a recurring event is not propagated to the other months.
-- The legacy financial_events.notes column is no longer read.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_event_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  timeline_id UUID REFERENCES public.timelines(id) ON DELETE CASCADE,
  timeboard_id UUID,
  content TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_event_notes_occurrence ON public.financial_event_notes USING btree (event_id, year, month);
CREATE INDEX IF NOT EXISTS idx_financial_event_notes_timeboard ON public.financial_event_notes USING btree (timeboard_id);

-- Refresh the PostgREST schema cache so the API sees the new table immediately
NOTIFY pgrst, 'reload schema';
