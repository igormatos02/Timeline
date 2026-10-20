-- ============================================================
-- Migration: 0014_timeboard_plans.sql
-- CondoFlow licenses: each condominium (timeboard) has a plan (shared/config/plans.js) and, for trials and paid
-- periods, the date it ends (after it, the condominium works as Free; no data is removed).
-- Existing timeboards keep every feature they use today (Profissional, no end date).
-- ============================================================

ALTER TABLE public.timeboards ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.timeboards ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

UPDATE public.timeboards SET plan = 'professional', plan_expires_at = NULL WHERE plan = 'free';
