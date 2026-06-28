CREATE TABLE IF NOT EXISTS chat_mensagens (
    id SERIAL PRIMARY KEY,
    servico_id INTEGER NOT NULL REFERENCES servicos_solicitados(id) ON DELETE CASCADE,
    remetente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    lida_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    CHECK (char_length(trim(mensagem)) BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_servico_criado
    ON chat_mensagens (servico_id, criado_em ASC);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_remetente
    ON chat_mensagens (remetente_id);
