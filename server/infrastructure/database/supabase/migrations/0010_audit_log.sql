-- ============================================================
-- Migration: 0010_audit_log.sql
-- Audit log of the actions that change money already recorded: deleting events (effective ones included,
-- admins only), reverting effective movements to pending, cancelling and correcting.
-- `snapshot` keeps a full copy of what was changed / removed (the event and its occurrence statuses).
-- Read only through the API (service role), like the other tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID REFERENCES public.timeboards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'event',
  entity_id TEXT,
  entity_name TEXT,
  occurrence_date DATE,
  amount NUMERIC,
  details JSONB,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timeboard_created ON public.audit_log(timeboard_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
