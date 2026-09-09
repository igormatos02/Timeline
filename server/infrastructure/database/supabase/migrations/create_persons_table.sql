-- Migration: Create persons table in Supabase
-- This table stores Persons, Organizations, and Members associated with Timeboards

CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'PERSON', -- 'PERSON', 'ORGANIZATION', 'MEMBER'
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  role TEXT DEFAULT 'CONTRIBUTOR', -- 'ADMIN', 'CONTRIBUTOR', 'VIEWER'
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by timeboard
CREATE INDEX IF NOT EXISTS idx_persons_timeboard_id ON persons(timeboard_id);

-- Enable RLS
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- Allow read & write policy for authenticated & anonymous users (adjust according to your security model)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'persons' AND policyname = 'Allow all operations on persons'
  ) THEN
    CREATE POLICY "Allow all operations on persons"
      ON persons
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
