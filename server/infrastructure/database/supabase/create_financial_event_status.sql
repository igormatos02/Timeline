-- DDL DE CRIAÇÃO DA TABELA financial_event_status
-- Armazena o estado dinâmico (positivo: pago, recebido, investido, etc.) por (year, month, event_id)

CREATE TABLE IF NOT EXISTS financial_event_status (
    year INT NOT NULL,
    month INT NOT NULL,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (year, month, event_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_event_status_event_id ON financial_event_status(event_id);
CREATE INDEX IF NOT EXISTS idx_financial_event_status_year_month ON financial_event_status(year, month);
