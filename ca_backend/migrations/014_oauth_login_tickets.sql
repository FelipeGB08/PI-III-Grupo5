CREATE TABLE IF NOT EXISTS oauth_login_tickets (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    state_hash CHAR(64) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMP NOT NULL,
    consumido_em TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_login_tickets_validade
    ON oauth_login_tickets (token_hash, state_hash, expira_em)
    WHERE consumido_em IS NULL;
