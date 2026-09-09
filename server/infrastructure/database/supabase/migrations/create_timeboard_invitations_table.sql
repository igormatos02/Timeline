-- Migration: Create timeboard_invitations table in Supabase
-- This table stores invitation records, status, and acceptance timestamps for Timeboard sharing

CREATE TABLE IF NOT EXISTS public.timeboard_invitations (
  id uuid not null default gen_random_uuid (),
  timeboard_id uuid not null,
  email text not null,
  role text not null,
  status text not null default 'PENDING'::text,
  invited_by uuid null,
  expires_at timestamp with time zone null,
  accepted_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint timeboard_invitations_pkey primary key (id),
  constraint fk_invitation_invited_by foreign KEY (invited_by) references users (id) on delete set null,
  constraint fk_invitation_timeboard foreign KEY (timeboard_id) references timeboards (id) on delete CASCADE
) TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeboard_invitations_timeboard_id ON public.timeboard_invitations(timeboard_id);
CREATE INDEX IF NOT EXISTS idx_timeboard_invitations_email ON public.timeboard_invitations(email);
CREATE INDEX IF NOT EXISTS idx_timeboard_invitations_status ON public.timeboard_invitations(status);

-- Enable RLS
ALTER TABLE public.timeboard_invitations ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated & service roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'timeboard_invitations' AND policyname = 'Allow all operations on timeboard_invitations'
  ) THEN
    CREATE POLICY "Allow all operations on timeboard_invitations"
      ON public.timeboard_invitations
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
