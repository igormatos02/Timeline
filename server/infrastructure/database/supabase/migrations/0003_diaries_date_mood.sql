-- ============================================================
-- Migration: 0003_diaries_date_mood.sql
-- Diary entries move from financial_events to the diaries table.
-- 1. Adds the entry day (date) and the mood to diaries
-- 2. Copies existing diary entries (event_type = 'register') keeping the same ids
-- The original rows stay in financial_events (which has no status column);
-- the server ignores 'register' events from financial_events.
-- ============================================================

ALTER TABLE public.diaries ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.diaries ADD COLUMN IF NOT EXISTS mood VARCHAR;

CREATE INDEX IF NOT EXISTS idx_diaries_timeline_date ON public.diaries USING btree (timeline_id, date);
CREATE INDEX IF NOT EXISTS idx_diaries_timeboard ON public.diaries USING btree (timeboard_id);

INSERT INTO public.diaries (id, timeboard_id, timeline_id, name, description, labels, notes, date, mood, tenant_id, created_at, updated_at)
SELECT
  fe.id,
  fe.timeboard_id,
  fe.timeline_id,
  fe.name,
  COALESCE(fe.description, ''),
  COALESCE(fe.labels, '[]'::jsonb),
  COALESCE(fe.notes, ''),
  fe.date,
  fe.category,
  fe.tenant_id,
  fe.created_at,
  fe.updated_at
FROM public.financial_events fe
WHERE fe.event_type = 'register'
  AND COALESCE(fe.is_terminated, false) = false
ON CONFLICT (id) DO NOTHING;

-- Refresh the PostgREST schema cache so the API sees the new columns/table immediately
NOTIFY pgrst, 'reload schema';
