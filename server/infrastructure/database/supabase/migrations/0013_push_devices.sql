-- ============================================================
-- Migration: 0013_push_devices.sql
-- Phones registered for push notifications (CondoFlow app, Firebase Cloud Messaging): one row per device token,
-- with the user, the language of the notifications and what the person wants to receive (new posts, reminders).
-- Read only through the API (service role), like the other tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  language TEXT NOT NULL DEFAULT 'pt',
  notify_posts BOOLEAN NOT NULL DEFAULT TRUE,
  notify_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_devices_user ON public.push_devices(user_id);

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
