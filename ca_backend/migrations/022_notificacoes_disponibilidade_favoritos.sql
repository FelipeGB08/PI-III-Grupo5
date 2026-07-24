CREATE TABLE IF NOT EXISTS preferencias_notificacao (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    novos_horarios_favoritos BOOLEAN NOT NULL DEFAULT TRUE,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificacoes_disponibilidade_favoritos (
    cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    notificado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cliente_id, profissional_id),
    CHECK (cliente_id <> profissional_id)
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_disponibilidade_profissional
    ON notificacoes_disponibilidade_favoritos (profissional_id, notificado_em DESC);
