-- ============================================================
-- Migration: 0020_receipt_codes.sql
-- Receipt codes (CondoFlow): every received fee gets a short, unguessable code (e.g. CF-7K3M-Q9XA) printed on its
-- receipt with a QR code; timeboard.pt/recibo/<code> tells whether the receipt is valid. Reverting or cancelling
-- the payment voids the code for good (a new payment gets a new code). The receipt e-mails link to the code.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.receipt_codes (
  code TEXT PRIMARY KEY,
  timeboard_id UUID NOT NULL REFERENCES public.timeboards(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,          -- series id of the fee (financial_events.event_id)
  occurrence_date DATE NOT NULL,   -- the month's occurrence
  person_id UUID,                  -- the unit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ
);

-- One valid code per occurrence
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_codes_active ON public.receipt_codes(event_id, occurrence_date) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_codes_timeboard ON public.receipt_codes(timeboard_id);

ALTER TABLE public.receipt_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_codes TO service_role;
