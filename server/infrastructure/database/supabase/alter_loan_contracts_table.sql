-- Migration script for updating loan_contracts table schema in Supabase
-- 1. Remove payment_iban column
ALTER TABLE IF EXISTS loan_contracts DROP COLUMN IF EXISTS payment_iban;

-- 2. Ensure total_installments column exists
ALTER TABLE IF EXISTS loan_contracts ADD COLUMN IF EXISTS total_installments INTEGER DEFAULT 0;
