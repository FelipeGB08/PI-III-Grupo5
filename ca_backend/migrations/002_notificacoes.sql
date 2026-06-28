CREATE TABLE IF NOT EXISTS dispositivo_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    plataforma VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispositivo_tokens_usuario
    ON dispositivo_tokens (usuario_id)
    WHERE ativo = TRUE;

CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(60) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    corpo TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'enviada', 'falha')),
    erro TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    enviada_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_criado
    ON notificacoes (usuario_id, criado_em DESC);
