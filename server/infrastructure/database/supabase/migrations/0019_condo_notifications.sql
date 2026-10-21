-- ============================================================
-- Migration: 0019_condo_notifications.sql
-- Notifications to the owners of a condominium's units (CondoFlow):
-- - per condominium, off by default: the receipt when a fee is received, and a monthly notice of overdue fees
--   (owners with the CondoFlow app get a push notification, the others an e-mail)
-- - email_outbox: every e-mail to send, sent while the daily budget of the free e-mail plan allows and kept for
--   the next day otherwise (never lost); dedupe_key avoids sending the same notice twice
-- ============================================================

ALTER TABLE public.timeboards ADD COLUMN IF NOT EXISTS notify_receipts BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.timeboards ADD COLUMN IF NOT EXISTS notify_overdue BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID REFERENCES public.timeboards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_timeboard ON public.email_outbox(timeboard_id, sent_at);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_outbox TO service_role;
