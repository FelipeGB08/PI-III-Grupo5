CREATE TABLE IF NOT EXISTS recovery_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    finalidade VARCHAR(20) NOT NULL CHECK (finalidade IN ('magic_link', 'password_reset')),
    expira_em TIMESTAMPTZ NOT NULL,
    consumido_em TIMESTAMPTZ NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_tokens_usuario_finalidade
    ON recovery_tokens (usuario_id, finalidade, expira_em DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_tokens_expiracao_pendentes
    ON recovery_tokens (expira_em)
    WHERE consumido_em IS NULL;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    chave_hash CHAR(64) PRIMARY KEY,
    contador INTEGER NOT NULL CHECK (contador > 0),
    reset_em TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset
    ON rate_limit_buckets (reset_em);

CREATE TABLE IF NOT EXISTS upload_claims (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    caminho VARCHAR(500) NOT NULL UNIQUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumido_em TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_claims_usuario_pendente
    ON upload_claims (usuario_id, criado_em DESC)
    WHERE consumido_em IS NULL;

ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL;

-- O backfill só atribui categoria quando a relação histórica é inequívoca.
WITH categoria_unica AS (
    SELECT profissional_id, MIN(categoria_id) AS categoria_id
    FROM profissional_categorias
    GROUP BY profissional_id
    HAVING COUNT(*) = 1
)
UPDATE servicos_solicitados s
SET categoria_id = cu.categoria_id
FROM categoria_unica cu
WHERE s.prof_id = cu.profissional_id
  AND s.categoria_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_categoria_id
    ON servicos_solicitados (categoria_id);
CREATE INDEX IF NOT EXISTS idx_profissional_agenda_servicos_profissional_id
    ON profissional_agenda_servicos (profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissional_categorias_categoria_id
    ON profissional_categorias (categoria_id);
CREATE INDEX IF NOT EXISTS idx_oauth_login_tickets_usuario_id
    ON oauth_login_tickets (usuario_id);
CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_agenda_servico_id
    ON servicos_solicitados (agenda_servico_id);
CREATE INDEX IF NOT EXISTS idx_servicos_solicitados_cancelado_por
    ON servicos_solicitados (cancelado_por);
CREATE INDEX IF NOT EXISTS idx_perfis_profissionais_revisado_por
    ON perfis_profissionais (revisado_por);
CREATE INDEX IF NOT EXISTS idx_denuncias_resolvido_por
    ON denuncias (resolvido_por);

-- Os registros legados representam horário civil da região AMAUC.
-- A conversão explicita esse significado antes de adotar armazenamento com fuso.
ALTER TABLE servicos_solicitados
    ALTER COLUMN agendado_para TYPE TIMESTAMPTZ
        USING agendado_para AT TIME ZONE 'America/Sao_Paulo',
    ALTER COLUMN remarcacao_solicitada_para TYPE TIMESTAMPTZ
        USING remarcacao_solicitada_para AT TIME ZONE 'America/Sao_Paulo',
    ALTER COLUMN cancelado_em TYPE TIMESTAMPTZ
        USING cancelado_em AT TIME ZONE 'America/Sao_Paulo',
    ALTER COLUMN conclusao_solicitada_em TYPE TIMESTAMPTZ
        USING conclusao_solicitada_em AT TIME ZONE 'America/Sao_Paulo',
    ALTER COLUMN conclusao_confirmada_em TYPE TIMESTAMPTZ
        USING conclusao_confirmada_em AT TIME ZONE 'America/Sao_Paulo';
