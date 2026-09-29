-- ============================================================
-- Migration: 0012_cleanup_wallet_migration.sql
-- Clean-up after 0011_wallet_timelines.sql, once the app has been checked:
-- 1. deletes the expense timelines that became empty (their expenses moved into the wallet);
-- 2. drops the 0011 backup tables — after this, 0011 can no longer be reverted.
-- financial_events.timeline_id is ON DELETE CASCADE: only timelines WITHOUT any event are deleted.
-- ============================================================

BEGIN;

-- Expense timelines that still hold events are kept (should be none: check the result of this first)
SELECT tl.id, tl.name, count(fe.id) AS events
  FROM public.timelines tl
  LEFT JOIN public.financial_events fe ON fe.timeline_id = tl.id
  WHERE lower(tl.type) IN ('expense', 'expenses')
  GROUP BY tl.id, tl.name
  HAVING count(fe.id) > 0;

-- 1. Empty expense timelines
DELETE FROM public.timelines expense_tl
  WHERE lower(expense_tl.type) IN ('expense', 'expenses')
    AND NOT EXISTS (SELECT 1 FROM public.financial_events fe WHERE fe.timeline_id = expense_tl.id)
    AND NOT EXISTS (SELECT 1 FROM public.financial_event_notes n WHERE n.timeline_id = expense_tl.id);

-- 2. Backup tables of 0011
DROP TABLE IF EXISTS public.migration_0011_timelines_backup;
DROP TABLE IF EXISTS public.migration_0011_events_backup;
DROP TABLE IF EXISTS public.migration_0011_notes_backup;

COMMIT;
