-- ==============================================================================
-- DDL DE RECIAÇÃO DA TABELA financial_events COM event_id E event_version
-- ==============================================================================

-- 1. Apaga a tabela antiga se existir
DROP TABLE IF EXISTS financial_events CASCADE;

-- 2. Cria a nova tabela financial_events estruturada
CREATE TABLE financial_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR NOT NULL,                      -- ID comum que une todas as versões da série/regra (NÃO É UNIQUE)
    event_version INT NOT NULL DEFAULT 0,          -- Versão puramente incremental (0, 1, 2, 3, ...)
    sobreposition_over VARCHAR,                     -- event_id de destino se for uma sobreposição pontual
    is_terminated BOOLEAN NOT NULL DEFAULT FALSE,   -- Indica se a série foi encerrada a partir desta versão
    day_of_month INT,                              -- Dia do mês fixo para recorrência
    
    tenant_id VARCHAR NOT NULL DEFAULT 'tenant-igor',
    timeboard_id UUID NOT NULL,
    timeline_id UUID,
    
    name VARCHAR NOT NULL,
    description TEXT DEFAULT '',
    financial_type VARCHAR NOT NULL,               -- 'entrada' | 'gasto' | 'investimento'
    category VARCHAR NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    date DATE NOT NULL,                            -- Data de início de vigência desta versão ou data do evento
    due_date DATE,
    paid_date DATE,
    
    status VARCHAR NOT NULL DEFAULT 'Pendente',     -- 'Pendente' | 'Pago' | 'Recebido' | 'Investido' | 'Liquidado' | 'Previsto'
    automatic BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    periodicity VARCHAR NOT NULL DEFAULT 'unico',  -- 'recorrente' | 'unico' | 'periodo'
    
    -- Campos específicos de Empréstimos / Parcelamento
    installment_number INT,
    total_installments INT,
    principal_amount NUMERIC(15, 2) DEFAULT 0,
    interest_amount NUMERIC(15, 2) DEFAULT 0,
    remaining_debt_after NUMERIC(15, 2),
    amortization_strategy VARCHAR,
    
    -- Metadados complementares
    labels JSONB DEFAULT '[]'::jsonb,
    breakdown_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    priority VARCHAR DEFAULT 'Normal',
    time VARCHAR DEFAULT '09:00',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_financial_events_event_id ON financial_events(event_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_timeboard ON financial_events(timeboard_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_timeline ON financial_events(timeline_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_date ON financial_events(date);
CREATE INDEX IF NOT EXISTS idx_financial_events_type ON financial_events(financial_type);
CREATE INDEX IF NOT EXISTS idx_financial_events_sobreposition ON financial_events(sobreposition_over);
