-- Migration: Update/Alter existing persons table in Supabase
-- Ensures all columns required for Persons, Organizations, and Members exist

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS timeboard_id UUID;

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'PERSON';

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS tax_id TEXT;

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'CONTRIBUTOR';

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Index for fast lookup by timeboard
CREATE INDEX IF NOT EXISTS idx_persons_timeboard_id ON persons(timeboard_id);

-- Enable RLS
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- Allow read & write policy for authenticated & anonymous users
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
