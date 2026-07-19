ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS preco_proposto NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS motivo_proposta_valor TEXT;

ALTER TABLE servicos_solicitados
    DROP CONSTRAINT IF EXISTS servicos_solicitados_status_check,
    ADD CONSTRAINT servicos_solicitados_status_check
        CHECK (
            status IN (
                'pendente',
                'proposta_valor',
                'aceito',
                'recusado',
                'concluido',
                'cancelado_cliente',
                'remarcacao_solicitada'
            )
        );
