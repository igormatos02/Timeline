-- ============================================================
-- Migration: 0008_invite_codes_and_rls.sql
-- 1. Invitation codes: a short code sent with the invitation e-mail, typed in the mobile app
--    (or on the web) to identify the invitation; single use, with an expiry date.
-- 2. Closes the public "Allow all operations" RLS policies: the frontend never reads the tables
--    directly (only through the API, which uses the service role key), and the anon key is public.
-- ============================================================

ALTER TABLE public.timeboard_invitations ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.timeboard_invitations ADD COLUMN IF NOT EXISTS accepted_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeboard_invitations_invite_code
  ON public.timeboard_invitations(invite_code) WHERE invite_code IS NOT NULL;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'Allow all operations on %'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
