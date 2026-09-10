-- Migration: 0001_initial_schema
-- Initial schema generated from the live Supabase database (public schema).
-- Tables: tenant, users, timeboards, timelines, persons, loan_contracts,
--         financial_events, financial_event_status, timeboard_members, timeboard_invitations

-- ============================================================
-- tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT
);

-- ============================================================
-- users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email VARCHAR,
  google_id TEXT,
  avatar_url TEXT,
  password VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ============================================================
-- timeboards
-- ============================================================
CREATE TABLE IF NOT EXISTS timeboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant TEXT NOT NULL DEFAULT 'default2',
  type TEXT NOT NULL DEFAULT 'financeiro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  "Currency" VARCHAR DEFAULT 'EUR'
);

-- ============================================================
-- timelines
-- ============================================================
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID NOT NULL REFERENCES timeboards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'in',
  color TEXT NOT NULL DEFAULT '#10b981',
  description TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'In Progress',
  aggregation TEXT NOT NULL DEFAULT 'monthly',
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timelines_timeboard_id ON timelines(timeboard_id);

-- ============================================================
-- persons
-- ============================================================
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID NOT NULL REFERENCES timeboards(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL DEFAULT 'person',
  person_name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  tax_id VARCHAR,
  role VARCHAR DEFAULT 'contributor',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  obligator_identification TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  observation VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_persons_timeboard_id ON persons(timeboard_id);

-- ============================================================
-- loan_contracts
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  timeboard_id UUID REFERENCES timeboards(id) ON DELETE CASCADE,
  contract_number VARCHAR,
  contract_name VARCHAR NOT NULL,
  category VARCHAR DEFAULT 'auto_loan',
  bank_name VARCHAR,
  tan_rate NUMERIC NOT NULL,
  spread NUMERIC DEFAULT 0,
  rate_type VARCHAR DEFAULT 'fixed',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_installments INTEGER NOT NULL,
  due_day INTEGER DEFAULT 15,
  installment_stamp_tax NUMERIC,
  processing_fee NUMERIC DEFAULT 0,
  insurance_fee NUMERIC DEFAULT 0,
  original_capital NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_contracts_timeline_id ON loan_contracts(timeline_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_timeboard_id ON loan_contracts(timeboard_id);

-- ============================================================
-- financial_events
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 0,
  is_terminated BOOLEAN NOT NULL DEFAULT FALSE,
  day_of_month INTEGER,
  timeboard_id UUID NOT NULL REFERENCES timeboards(id) ON DELETE CASCADE,
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_type VARCHAR NOT NULL,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  automatic BOOLEAN NOT NULL DEFAULT FALSE,
  --is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence VARCHAR NOT NULL DEFAULT 'once',
  periodicity VARCHAR NOT NULL DEFAULT 'monthly',
  installment_number INTEGER,
  total_installments INTEGER,
  installment_capital NUMERIC DEFAULT 0,
  installment_interest NUMERIC DEFAULT 0,
  labels JSONB,
  breakdown_items JSONB,
  notes TEXT NOT NULL DEFAULT '',
  priority VARCHAR NOT NULL DEFAULT 'Normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  category VARCHAR,
  installment_fee NUMERIC,
  amortization_amount NUMERIC,
  is_external BOOLEAN,
  is_obligation BOOLEAN NOT NULL DEFAULT FALSE,
  obligation_person_id UUID REFERENCES persons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_events_timeboard_id ON financial_events(timeboard_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_timeline_id ON financial_events(timeline_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_event_id ON financial_events(event_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_obligation_person_id ON financial_events(obligation_person_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_is_obligation ON financial_events(is_obligation);

-- ============================================================
-- financial_event_status
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_event_status (
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  timeboard_id UUID,
  PRIMARY KEY (year, month, event_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_event_status_timeline_id ON financial_event_status(timeline_id);

-- ============================================================
-- timeboard_members
-- ============================================================
CREATE TABLE IF NOT EXISTS timeboard_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID NOT NULL REFERENCES timeboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeboard_members_timeboard_id ON timeboard_members(timeboard_id);
CREATE INDEX IF NOT EXISTS idx_timeboard_members_user_id ON timeboard_members(user_id);

-- ============================================================
-- timeboard_invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS timeboard_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeboard_id UUID NOT NULL REFERENCES timeboards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeboard_invitations_timeboard_id ON timeboard_invitations(timeboard_id);
CREATE INDEX IF NOT EXISTS idx_timeboard_invitations_email ON timeboard_invitations(email);
CREATE INDEX IF NOT EXISTS idx_timeboard_invitations_status ON timeboard_invitations(status);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_event_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeboard_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeboard_invitations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenant','users','timeboards','timelines','persons','loan_contracts','financial_events','financial_event_status','timeboard_members','timeboard_invitations']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'Allow all operations on ' || tbl
    ) THEN
      EXECUTE format('CREATE POLICY "Allow all operations on %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END IF;
  END LOOP;
END
$$;