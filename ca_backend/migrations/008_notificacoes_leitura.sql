ALTER TABLE notificacoes
    ADD COLUMN IF NOT EXISTS lida_em TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida
    ON notificacoes (usuario_id, lida_em)
    WHERE lida_em IS NULL;
