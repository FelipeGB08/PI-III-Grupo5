CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMP NOT NULL,
    revogado_em TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_id
    ON refresh_tokens (usuario_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_validade
    ON refresh_tokens (token_hash, expira_em)
    WHERE revogado_em IS NULL;
