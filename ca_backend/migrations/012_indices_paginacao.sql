CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_cidadao
    ON servicos_solicitados (cidadao_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_prof
    ON servicos_solicitados (prof_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_status
    ON servicos_solicitados (status);

CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_prof_agendado_ativo
    ON servicos_solicitados (prof_id, agendado_para)
    WHERE status IN ('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada');

CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_prof_remarcacao_ativa
    ON servicos_solicitados (prof_id, remarcacao_solicitada_para)
    WHERE status IN ('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada');
