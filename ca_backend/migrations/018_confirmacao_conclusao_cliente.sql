ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS conclusao_solicitada_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS conclusao_confirmada_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS conclusao_confirmada_automaticamente BOOLEAN
        NOT NULL DEFAULT FALSE;

ALTER TABLE servicos_solicitados
    DROP CONSTRAINT IF EXISTS servicos_solicitados_status_check;

ALTER TABLE servicos_solicitados
    ADD CONSTRAINT servicos_solicitados_status_check
        CHECK (
            status IN (
                'pendente',
                'proposta_valor',
                'aceito',
                'recusado',
                'aguardando_confirmacao_cliente',
                'concluido',
                'cancelado_cliente',
                'remarcacao_solicitada'
            )
        );

CREATE INDEX IF NOT EXISTS idx_servicos_aguardando_confirmacao
    ON servicos_solicitados (conclusao_solicitada_em)
    WHERE status = 'aguardando_confirmacao_cliente';
