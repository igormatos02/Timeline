-- DDL DE ALTERAÇÃO DA TABELA financial_events
-- Remove a coluna estática 'status' da tabela 'financial_events',
-- visto que os estados dinâmicos mensais são geridos exclusivamente pela tabela 'financial_event_status'.

ALTER TABLE financial_events DROP COLUMN IF EXISTS status;
