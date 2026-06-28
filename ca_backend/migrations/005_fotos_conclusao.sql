ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS fotos_conclusao TEXT[] NOT NULL DEFAULT '{}';
