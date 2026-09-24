-- ============================================================
-- Migration: 0004_create_reminders.sql
-- Reminder events move from financial_events to their own table.
-- 'reminders' has exactly the same columns as financial_events, so recurrence,
-- versions and occurrence statuses (financial_event_status, keyed by event id)
-- keep working unchanged. Events of timelines with type 'reminder' are moved,
-- keeping their ids.
-- Runs in a single transaction: either everything is applied or nothing is.
-- ============================================================

BEGIN;

-- Safety check: abort if any table references financial_events through a foreign key,
-- because the moved rows are deleted from financial_events at the end.
DO $$
DECLARE
  ref_count INTEGER;
BEGIN
  SELECT count(*) INTO ref_count
  FROM pg_constraint
  WHERE contype = 'f' AND confrelid = 'public.financial_events'::regclass;
  IF ref_count > 0 THEN
    RAISE EXCEPTION 'Aborting: % foreign key(s) reference financial_events. Review them before moving reminders.', ref_count;
  END IF;
END $$;

-- 1. Table with the same structure (columns, defaults, primary key, indexes)
CREATE TABLE IF NOT EXISTS public.reminders (LIKE public.financial_events INCLUDING ALL);

-- 2. Foreign keys (LIKE does not copy them)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_timeline_id_fkey') THEN
    ALTER TABLE public.reminders
      ADD CONSTRAINT reminders_timeline_id_fkey FOREIGN KEY (timeline_id) REFERENCES public.timelines(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_timeboard_id_fkey') THEN
    ALTER TABLE public.reminders
      ADD CONSTRAINT reminders_timeboard_id_fkey FOREIGN KEY (timeboard_id) REFERENCES public.timeboards(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reminders_tenant_id_fkey') THEN
    ALTER TABLE public.reminders
      ADD CONSTRAINT reminders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Copy the events of reminder timelines (same ids)
INSERT INTO public.reminders
SELECT fe.*
FROM public.financial_events fe
WHERE fe.timeline_id IN (SELECT id FROM public.timelines WHERE type = 'reminder')
ON CONFLICT (id) DO NOTHING;

-- 4. Remove the moved rows from financial_events (they now live in reminders)
DELETE FROM public.financial_events
WHERE id IN (SELECT id FROM public.reminders);

COMMIT;

-- Refresh the PostgREST schema cache so the API sees the new columns/table immediately
NOTIFY pgrst, 'reload schema';
