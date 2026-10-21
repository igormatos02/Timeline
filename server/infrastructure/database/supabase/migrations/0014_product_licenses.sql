-- ============================================================
-- Migration: 0014_product_licenses.sql
-- Licenses per account and product (shared/config/products.js, shared/config/plans.js): the plan an account has
-- in a product (e.g. CondoFlow Profissional), how many condominiums it covers (null = the plan's default) and,
-- for trials and paid periods, when it ends (after it the account works as Free; no data is removed).
-- The condominiums of an account use its license; invited people use the license of the condominium's owner.
-- Owners of existing condominiums keep everything they use today (Profissional, no end date, all their condos).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  condominiums INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product)
);

CREATE INDEX IF NOT EXISTS idx_product_licenses_user ON public.product_licenses(user_id);

-- Read and written only through the API (service role), like the other tables
ALTER TABLE public.product_licenses ENABLE ROW LEVEL SECURITY;

INSERT INTO public.product_licenses (user_id, product, plan, condominiums)
SELECT t.owner_id, 'condoflow', 'professional', GREATEST(COUNT(*), 1)
FROM public.timeboards t
JOIN public.users u ON u.id = t.owner_id
WHERE t.type = 'condoflow'
GROUP BY t.owner_id
ON CONFLICT (user_id, product) DO NOTHING;
