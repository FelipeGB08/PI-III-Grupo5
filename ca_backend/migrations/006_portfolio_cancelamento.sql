ALTER TABLE perfis_profissionais
    ADD COLUMN IF NOT EXISTS portfolio_fotos TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS certificacoes TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS politica_cancelamento VARCHAR(40),
    ADD COLUMN IF NOT EXISTS reembolso_status VARCHAR(40);
