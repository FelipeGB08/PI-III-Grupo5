ALTER TABLE perfis_profissionais
    ADD COLUMN IF NOT EXISTS status_verificacao VARCHAR(20)
        NOT NULL DEFAULT 'nao_enviado',
    ADD COLUMN IF NOT EXISTS documento_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS revisado_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS revisado_por INTEGER REFERENCES usuarios(id)
        ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

ALTER TABLE perfis_profissionais
    DROP CONSTRAINT IF EXISTS perfis_profissionais_status_verificacao_check;

ALTER TABLE perfis_profissionais
    ADD CONSTRAINT perfis_profissionais_status_verificacao_check
        CHECK (
            status_verificacao IN (
                'nao_enviado',
                'pendente',
                'aprovado',
                'rejeitado'
            )
        );

-- Mantem os selos legados ja concedidos, agora sob o fluxo rastreavel.
UPDATE perfis_profissionais
SET status_verificacao = 'aprovado'
WHERE verificado = TRUE
  AND status_verificacao = 'nao_enviado';

CREATE INDEX IF NOT EXISTS idx_perfis_profissionais_verificacao_pendente
    ON perfis_profissionais (enviado_em ASC)
    WHERE status_verificacao = 'pendente';
