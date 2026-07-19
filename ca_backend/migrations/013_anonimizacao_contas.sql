ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP NULL;

UPDATE usuarios
SET ativo = TRUE
WHERE ativo IS NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_ativos_perfil
    ON usuarios (perfil_tipo)
    WHERE ativo = TRUE;
