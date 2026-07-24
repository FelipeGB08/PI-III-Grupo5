CREATE TABLE IF NOT EXISTS denuncias (
    id BIGSERIAL PRIMARY KEY,
    servico_solicitado_id INTEGER NOT NULL
        REFERENCES servicos_solicitados(id) ON DELETE RESTRICT,
    denunciante_id INTEGER NOT NULL
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo VARCHAR(40) NOT NULL
        CHECK (motivo IN (
            'servico_nao_realizado',
            'cobranca_indevida',
            'comportamento_inadequado',
            'outro'
        )),
    descricao TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberta'
        CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'arquivada')),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_em TIMESTAMP NULL,
    resolucao_admin TEXT NULL,
    resolvido_por INTEGER NULL REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_denuncias_status_criado_em
    ON denuncias (status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_denuncias_servico
    ON denuncias (servico_solicitado_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_denuncias_denunciante
    ON denuncias (denunciante_id, criado_em DESC);
