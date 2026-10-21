-- ============================================================
-- Migration: 0015_condominium_settings.sql
-- Condominium settings (CondoFlow, settings → Geral):
-- - base_fee_amount: the base monthly fee, only a reference that prefills new units' fees and new
--   condominium-payment entries (changing it never changes stored entries)
-- - fee_channel: where the fees are received by default ('cash' or 'bank', shared/enums PaymentChannel)
-- The accounting start date is the existing compute_from column.
-- ============================================================

ALTER TABLE public.timeboards ADD COLUMN IF NOT EXISTS base_fee_amount NUMERIC(12, 2);
ALTER TABLE public.timeboards ADD COLUMN IF NOT EXISTS fee_channel TEXT;
