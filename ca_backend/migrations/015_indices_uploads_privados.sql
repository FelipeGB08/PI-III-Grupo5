CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_foto_url
    ON servicos_solicitados (foto_url)
    WHERE foto_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_fotos_conclusao
    ON servicos_solicitados USING GIN (fotos_conclusao);
