-- ============================================================
-- Migration: 0011_wallet_timelines.sql
-- Accounts model: the income timeline becomes the cash wallet ("Carteira" / "Caixa") and the wallet expenses,
-- stored until now in the expense timeline, move into the wallet. The expense timeline is then empty; it is
-- hidden by the app (the outflows mode of the balance replaces it) and is NOT deleted here:
-- financial_events.timeline_id is ON DELETE CASCADE, so deleting it before moving would delete the expenses.
--
-- Run it first on a test timeboard / project. Everything moved is recorded in backup tables, so it can be
-- reverted (see ROLLBACK at the end).
-- ============================================================

BEGIN;

-- 1. Backups (what is changed, and its previous value)
CREATE TABLE IF NOT EXISTS public.migration_0011_timelines_backup AS
  SELECT id, type, now() AS backed_up_at
  FROM public.timelines
  WHERE lower(type) IN ('income', 'incomes');

CREATE TABLE IF NOT EXISTS public.migration_0011_events_backup AS
  SELECT fe.id, fe.timeline_id, now() AS backed_up_at
  FROM public.financial_events fe
  JOIN public.timelines expense_tl ON expense_tl.id = fe.timeline_id
  WHERE lower(expense_tl.type) IN ('expense', 'expenses')
    AND EXISTS (
      SELECT 1 FROM public.timelines wallet_tl
      WHERE wallet_tl.timeboard_id = expense_tl.timeboard_id
        AND lower(wallet_tl.type) IN ('income', 'incomes', 'wallet')
    );

CREATE TABLE IF NOT EXISTS public.migration_0011_notes_backup AS
  SELECT n.id, n.timeline_id, now() AS backed_up_at
  FROM public.financial_event_notes n
  JOIN public.timelines expense_tl ON expense_tl.id::text = n.timeline_id::text
  WHERE lower(expense_tl.type) IN ('expense', 'expenses')
    AND EXISTS (
      SELECT 1 FROM public.timelines wallet_tl
      WHERE wallet_tl.timeboard_id = expense_tl.timeboard_id
        AND lower(wallet_tl.type) IN ('income', 'incomes', 'wallet')
    );

-- 2. The income timeline becomes the wallet
UPDATE public.timelines
  SET type = 'wallet', updated_at = now()
  WHERE lower(type) IN ('income', 'incomes');

-- 3. Wallet expenses move from the expense timeline into the wallet of the same timeboard
UPDATE public.financial_events fe
  SET timeline_id = wallet_tl.id
  FROM public.timelines expense_tl, public.timelines wallet_tl
  WHERE fe.timeline_id = expense_tl.id
    AND lower(expense_tl.type) IN ('expense', 'expenses')
    AND wallet_tl.timeboard_id = expense_tl.timeboard_id
    AND wallet_tl.type = 'wallet';

-- 4. Their notes follow them
UPDATE public.financial_event_notes n
  SET timeline_id = wallet_tl.id
  FROM public.timelines expense_tl, public.timelines wallet_tl
  WHERE n.timeline_id::text = expense_tl.id::text
    AND lower(expense_tl.type) IN ('expense', 'expenses')
    AND wallet_tl.timeboard_id = expense_tl.timeboard_id
    AND wallet_tl.type = 'wallet';

COMMIT;

-- ============================================================
-- Check after running (should return 0 rows: no event left in an expense timeline that has a wallet)
-- ============================================================
-- SELECT fe.id FROM public.financial_events fe
--   JOIN public.timelines expense_tl ON expense_tl.id = fe.timeline_id
--   WHERE lower(expense_tl.type) IN ('expense', 'expenses')
--     AND EXISTS (SELECT 1 FROM public.timelines w WHERE w.timeboard_id = expense_tl.timeboard_id AND w.type = 'wallet');

-- ============================================================
-- Optional, later and only after checking the app: remove the now empty expense timelines
-- ============================================================
-- DELETE FROM public.timelines expense_tl
--   WHERE lower(expense_tl.type) IN ('expense', 'expenses')
--     AND NOT EXISTS (SELECT 1 FROM public.financial_events fe WHERE fe.timeline_id = expense_tl.id);

-- ============================================================
-- ROLLBACK (puts everything back from the backups)
-- ============================================================
-- BEGIN;
-- UPDATE public.financial_events fe SET timeline_id = b.timeline_id
--   FROM public.migration_0011_events_backup b WHERE fe.id = b.id;
-- UPDATE public.financial_event_notes n SET timeline_id = b.timeline_id
--   FROM public.migration_0011_notes_backup b WHERE n.id = b.id;
-- UPDATE public.timelines tl SET type = b.type, updated_at = now()
--   FROM public.migration_0011_timelines_backup b WHERE tl.id = b.id;
-- COMMIT;
