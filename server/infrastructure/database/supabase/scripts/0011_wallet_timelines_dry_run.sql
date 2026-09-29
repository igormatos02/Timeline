-- ============================================================
-- DRY RUN of migrations/0011_wallet_timelines.sql
-- Runs the same changes inside a transaction, shows what they would do, and ROLLS BACK: nothing is kept.
-- Run it in the Supabase SQL editor and check the result sets before running the real migration.
-- ============================================================

BEGIN;

-- Before: timelines by type
SELECT 'before' AS step, lower(type) AS type, count(*) AS timelines
  FROM public.timelines GROUP BY lower(type) ORDER BY 2;

-- Events that will move from the expense timeline into the wallet, per timeboard
SELECT tb.name AS timeboard, expense_tl.name AS from_timeline, wallet_tl.name AS to_wallet, count(fe.id) AS events
  FROM public.financial_events fe
  JOIN public.timelines expense_tl ON expense_tl.id = fe.timeline_id
  JOIN public.timelines wallet_tl ON wallet_tl.timeboard_id = expense_tl.timeboard_id
    AND lower(wallet_tl.type) IN ('income', 'incomes', 'wallet')
  JOIN public.timeboards tb ON tb.id = expense_tl.timeboard_id
  WHERE lower(expense_tl.type) IN ('expense', 'expenses')
  GROUP BY tb.name, expense_tl.name, wallet_tl.name
  ORDER BY tb.name;

-- Timeboards with more than one income/wallet timeline (the expenses would be moved to each: must be 0 rows)
SELECT tb.name AS timeboard, count(*) AS wallet_like_timelines
  FROM public.timelines tl JOIN public.timeboards tb ON tb.id = tl.timeboard_id
  WHERE lower(tl.type) IN ('income', 'incomes', 'wallet')
  GROUP BY tb.name HAVING count(*) > 1;

-- The migration itself (same statements as 0011, without the backup tables)
UPDATE public.timelines SET type = 'wallet', updated_at = now()
  WHERE lower(type) IN ('income', 'incomes');

UPDATE public.financial_events fe
  SET timeline_id = wallet_tl.id
  FROM public.timelines expense_tl, public.timelines wallet_tl
  WHERE fe.timeline_id = expense_tl.id
    AND lower(expense_tl.type) IN ('expense', 'expenses')
    AND wallet_tl.timeboard_id = expense_tl.timeboard_id
    AND wallet_tl.type = 'wallet';

UPDATE public.financial_event_notes n
  SET timeline_id = wallet_tl.id
  FROM public.timelines expense_tl, public.timelines wallet_tl
  WHERE n.timeline_id::text = expense_tl.id::text
    AND lower(expense_tl.type) IN ('expense', 'expenses')
    AND wallet_tl.timeboard_id = expense_tl.timeboard_id
    AND wallet_tl.type = 'wallet';

-- After: timelines by type (income should be gone, wallet in its place)
SELECT 'after' AS step, lower(type) AS type, count(*) AS timelines
  FROM public.timelines GROUP BY lower(type) ORDER BY 2;

-- After: events left in an expense timeline of a timeboard with a wallet (must be 0)
SELECT count(*) AS events_left_in_expense_timelines
  FROM public.financial_events fe
  JOIN public.timelines expense_tl ON expense_tl.id = fe.timeline_id
  WHERE lower(expense_tl.type) IN ('expense', 'expenses')
    AND EXISTS (SELECT 1 FROM public.timelines w WHERE w.timeboard_id = expense_tl.timeboard_id AND w.type = 'wallet');

ROLLBACK;
