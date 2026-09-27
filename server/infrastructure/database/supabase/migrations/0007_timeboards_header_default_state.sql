-- ============================================================
-- Migration: 0007_timeboards_header_default_state.sql
-- Timeboard setting: whether the timeline headers start collapsed or expanded.
-- Values: 'collapsed' | 'expanded' (shared/enums/HeaderDefaultState.js)
-- ============================================================

ALTER TABLE public.timeboards
  ADD COLUMN IF NOT EXISTS header_default_state TEXT NOT NULL DEFAULT 'collapsed';
