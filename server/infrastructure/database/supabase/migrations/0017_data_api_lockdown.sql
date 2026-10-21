-- ============================================================
-- Migration: 0017_data_api_lockdown.sql
-- Security review (2026-10-21): browsers and the apps never use the Supabase Data API — they only use Supabase
-- Auth (Google sign-in) and the app's own API, which reaches the database with the service_role key. So:
-- - every table in "public" has row level security on (a table without it would be open to the Data API)
-- - the public roles (anon = anyone with the public key, authenticated = anyone signed in with Supabase Auth)
--   lose every privilege on tables, sequences and functions of "public", now and for objects created later,
--   so no policy (old, or added by hand in the dashboard) can expose data
-- service_role (migration 0016) is not affected. Supabase Auth itself lives in the "auth" schema and keeps working.
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Review aid: tables without RLS (should be none) and policies left (harmless now, listed to clean up)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
-- SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';
