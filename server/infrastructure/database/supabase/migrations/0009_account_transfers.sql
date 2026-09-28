-- ============================================================
-- Migration: 0009_account_transfers.sql
-- Account transfers (event_type 'pocket_transfer'): money moved between two spaces of the account.
-- pocket_id = origin space, target_pocket_id = destination space (NULL = the account's General space).
-- Legacy pocket costs become expenses paid by the account with the "bank fees" category.
-- ============================================================

ALTER TABLE public.financial_events
  ADD COLUMN IF NOT EXISTS target_pocket_id UUID REFERENCES public.pockets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_events_target_pocket_id ON public.financial_events(target_pocket_id);

UPDATE public.financial_events
  SET event_type = 'pocket_expense', category = 'bank_fees'
  WHERE event_type = 'pocket_cost';
