-- ============================================================
-- Migration: 0005_diaries_publish_status.sql
-- Condominium (condoflow) diary posts can be published or not.
-- Only published posts are shown to individual users. Default: unpublished.
-- ============================================================

ALTER TABLE public.diaries ADD COLUMN IF NOT EXISTS publish_status VARCHAR NOT NULL DEFAULT 'unpublished';

-- Refresh the PostgREST schema cache so the API sees the new column immediately
NOTIFY pgrst, 'reload schema';
