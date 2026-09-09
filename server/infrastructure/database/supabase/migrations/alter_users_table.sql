-- Migration: Add password and google_id to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for fast lookup by email and google_id
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow read & write policy for authenticated & anonymous users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all operations on users'
  ) THEN
    CREATE POLICY "Allow all operations on users"
      ON users
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
