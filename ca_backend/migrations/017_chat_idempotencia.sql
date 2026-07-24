ALTER TABLE chat_mensagens
    ADD COLUMN IF NOT EXISTS client_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_mensagens_remetente_client_id
    ON chat_mensagens (remetente_id, client_id);
