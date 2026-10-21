-- ============================================================
-- Migration: 0016_service_role_grants.sql
-- From 2026-10-30 Supabase no longer grants Data API access to new tables in "public" automatically.
-- The app reaches the database only through its API server with the service_role key (browsers never use the
-- Data API: anon / authenticated get nothing). This keeps that working:
-- - every existing table, sequence and function in "public" is granted to service_role (also when the schema is
--   rebuilt from these migrations: new project, preview branch, local db reset)
-- - tables, sequences and functions created later are granted to service_role by default
-- New migrations may still add "grant ... to service_role" next to each create table, as Supabase recommends.
-- ============================================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
