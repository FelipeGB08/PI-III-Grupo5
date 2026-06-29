CREATE TABLE IF NOT EXISTS favoritos_profissionais (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, profissional_id),
    CHECK (usuario_id <> profissional_id)
);

CREATE INDEX IF NOT EXISTS idx_favoritos_usuario
    ON favoritos_profissionais (usuario_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_favoritos_profissional
    ON favoritos_profissionais (profissional_id);
