-- Schema oficial do Conecta AMAUC (PostgreSQL)
-- Execute: npm run db:migrate

  DROP TABLE IF EXISTS avaliacoes CASCADE;
  DROP TABLE IF EXISTS denuncias CASCADE;
  DROP TABLE IF EXISTS chat_mensagens CASCADE;
  DROP TABLE IF EXISTS notificacoes_disponibilidade_favoritos CASCADE;
  DROP TABLE IF EXISTS preferencias_notificacao CASCADE;
  DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS dispositivo_tokens CASCADE;
DROP TABLE IF EXISTS profissional_agenda_horarios CASCADE;
DROP TABLE IF EXISTS profissional_agenda_servicos CASCADE;
DROP TABLE IF EXISTS servicos_solicitados CASCADE;
DROP TABLE IF EXISTS profissional_categorias CASCADE;
DROP TABLE IF EXISTS perfis_profissionais CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS oauth_login_tickets CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(30),
    cidade_amauc VARCHAR(100) NOT NULL,
    endereco_principal TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    perfil_tipo VARCHAR(30) NOT NULL
        CHECK (perfil_tipo IN ('cidadao', 'profissional', 'admin')),
    foto_url VARCHAR(500),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    excluido_em TIMESTAMP NULL,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usuarios_ativos_perfil
    ON usuarios (perfil_tipo)
    WHERE ativo = TRUE;

CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMP NOT NULL,
    revogado_em TIMESTAMP NULL
);

CREATE INDEX idx_refresh_tokens_usuario_id
    ON refresh_tokens (usuario_id);

CREATE INDEX idx_refresh_tokens_validade
    ON refresh_tokens (token_hash, expira_em)
    WHERE revogado_em IS NULL;

CREATE TABLE oauth_login_tickets (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    state_hash CHAR(64) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMP NOT NULL,
    consumido_em TIMESTAMP NULL
);

CREATE INDEX idx_oauth_login_tickets_validade
    ON oauth_login_tickets (token_hash, state_hash, expira_em)
    WHERE consumido_em IS NULL;

CREATE TABLE perfis_profissionais (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    biografia TEXT,
    curriculo_texto TEXT,
    portfolio_url VARCHAR(500),
    portfolio_fotos TEXT[] NOT NULL DEFAULT '{}',
    certificacoes TEXT[] NOT NULL DEFAULT '{}',
    anos_experiencia INTEGER DEFAULT 0,
    verificado BOOLEAN DEFAULT FALSE,
    status_verificacao VARCHAR(20) NOT NULL DEFAULT 'nao_enviado'
        CHECK (
            status_verificacao IN (
                'nao_enviado',
                'pendente',
                'aprovado',
                'rejeitado'
            )
        ),
    documento_url VARCHAR(500),
    enviado_em TIMESTAMP,
    revisado_em TIMESTAMP,
    revisado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo_rejeicao TEXT,
    atende_rural BOOLEAN NOT NULL DEFAULT FALSE,
    atende_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
    possui_veiculo BOOLEAN NOT NULL DEFAULT FALSE,
    cidades_atendidas TEXT[] NOT NULL DEFAULT '{}',
    taxa_deslocamento NUMERIC(10, 2)
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome_servico VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE profissional_categorias (
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    PRIMARY KEY (profissional_id, categoria_id)
);

CREATE TABLE profissional_agenda_servicos (
    id SERIAL PRIMARY KEY,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    duracao_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracao_minutos > 0),
    preco NUMERIC(10, 2) NOT NULL CHECK (preco > 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profissional_agenda_horarios (
    id SERIAL PRIMARY KEY,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    horario TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (profissional_id, dia_semana, horario)
);

CREATE TABLE servicos_solicitados (
    id SERIAL PRIMARY KEY,
    cidadao_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    prof_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    agenda_servico_id INTEGER REFERENCES profissional_agenda_servicos(id) ON DELETE SET NULL,
    servico_nome VARCHAR(120),
    descricao TEXT NOT NULL,
    endereco_atendimento TEXT,
    atendimento_latitude NUMERIC(10, 7)
        CHECK (
            atendimento_latitude IS NULL
            OR atendimento_latitude BETWEEN -90 AND 90
        ),
    atendimento_longitude NUMERIC(10, 7)
        CHECK (
            atendimento_longitude IS NULL
            OR atendimento_longitude BETWEEN -180 AND 180
        ),
    agendado_para TIMESTAMP,
    duracao_minutos INTEGER,
    foto_url VARCHAR(500),
    fotos_conclusao TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'pendente'
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
        ),
    preco NUMERIC(10, 2),
    preco_proposto NUMERIC(10, 2),
    motivo_proposta_valor TEXT,
    motivo_cancelamento TEXT,
    cancelado_em TIMESTAMP,
    cancelado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    politica_cancelamento VARCHAR(40),
    reembolso_status VARCHAR(40),
    motivo_remarcacao TEXT,
    remarcacao_solicitada_para TIMESTAMP,
    conclusao_solicitada_em TIMESTAMP,
    conclusao_confirmada_em TIMESTAMP,
    conclusao_confirmada_automaticamente BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP
);

CREATE INDEX idx_profissional_agenda_horarios_ativos
    ON profissional_agenda_horarios (profissional_id, dia_semana, horario)
    WHERE ativo = TRUE;

CREATE TABLE denuncias (
    id BIGSERIAL PRIMARY KEY,
    servico_solicitado_id INTEGER NOT NULL
        REFERENCES servicos_solicitados(id) ON DELETE RESTRICT,
    denunciante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo VARCHAR(40) NOT NULL
        CHECK (motivo IN (
            'servico_nao_realizado',
            'cobranca_indevida',
            'comportamento_inadequado',
            'outro'
        )),
    descricao TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberta'
        CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'arquivada')),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_em TIMESTAMP,
    resolucao_admin TEXT,
    resolvido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    servico_id INTEGER NOT NULL UNIQUE REFERENCES servicos_solicitados(id) ON DELETE CASCADE,
    nota_estrelas INTEGER NOT NULL CHECK (nota_estrelas BETWEEN 1 AND 5),
    comentario TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_mensagens (
    id SERIAL PRIMARY KEY,
    servico_id INTEGER NOT NULL REFERENCES servicos_solicitados(id) ON DELETE CASCADE,
    remetente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    client_id VARCHAR(64),
    mensagem TEXT NOT NULL,
    lida_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    CHECK (char_length(trim(mensagem)) BETWEEN 1 AND 1000)
);

CREATE INDEX idx_chat_mensagens_servico_criado
    ON chat_mensagens (servico_id, criado_em ASC);

CREATE INDEX idx_chat_mensagens_remetente
    ON chat_mensagens (remetente_id);

CREATE UNIQUE INDEX idx_chat_mensagens_remetente_client_id
    ON chat_mensagens (remetente_id, client_id);

CREATE TABLE dispositivo_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    plataforma VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dispositivo_tokens_usuario
    ON dispositivo_tokens (usuario_id)
    WHERE ativo = TRUE;

CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(60) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    corpo TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'enviada', 'falha')),
    erro TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    enviada_em TIMESTAMP,
    lida_em TIMESTAMP
);

CREATE INDEX idx_notificacoes_usuario_criado
    ON notificacoes (usuario_id, criado_em DESC);

CREATE INDEX idx_notificacoes_usuario_lida
    ON notificacoes (usuario_id, lida_em)
    WHERE lida_em IS NULL;

CREATE TABLE favoritos_profissionais (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, profissional_id),
    CHECK (usuario_id <> profissional_id)
);

CREATE INDEX idx_favoritos_usuario
    ON favoritos_profissionais (usuario_id, criado_em DESC);

  CREATE INDEX idx_favoritos_profissional
      ON favoritos_profissionais (profissional_id);

  CREATE TABLE preferencias_notificacao (
      usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      novos_horarios_favoritos BOOLEAN NOT NULL DEFAULT TRUE,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE notificacoes_disponibilidade_favoritos (
      cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      notificado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (cliente_id, profissional_id),
      CHECK (cliente_id <> profissional_id)
  );

  CREATE INDEX idx_notificacoes_disponibilidade_profissional
      ON notificacoes_disponibilidade_favoritos (profissional_id, notificado_em DESC);

CREATE INDEX idx_servicos_solicitados_foto_url
    ON servicos_solicitados (foto_url)
    WHERE foto_url IS NOT NULL;

CREATE INDEX idx_servicos_solicitados_fotos_conclusao
    ON servicos_solicitados USING GIN (fotos_conclusao);

CREATE INDEX idx_servicos_aguardando_confirmacao
    ON servicos_solicitados (conclusao_solicitada_em)
    WHERE status = 'aguardando_confirmacao_cliente';

CREATE INDEX idx_perfis_profissionais_verificacao_pendente
    ON perfis_profissionais (enviado_em ASC)
    WHERE status_verificacao = 'pendente';

CREATE INDEX idx_denuncias_status_criado_em
    ON denuncias (status, criado_em DESC);

CREATE INDEX idx_denuncias_servico
    ON denuncias (servico_solicitado_id, criado_em DESC);

CREATE INDEX idx_denuncias_denunciante
    ON denuncias (denunciante_id, criado_em DESC);

CREATE OR REPLACE FUNCTION validar_papeis_servico()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = NEW.cidadao_id AND perfil_tipo = 'cidadao'
    ) THEN
        RAISE EXCEPTION 'cidadao_id deve referenciar um usuario cidadao';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = NEW.prof_id AND perfil_tipo = 'profissional'
    ) THEN
        RAISE EXCEPTION 'prof_id deve referenciar um usuario profissional';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_papeis_servico
BEFORE INSERT OR UPDATE OF cidadao_id, prof_id ON servicos_solicitados
FOR EACH ROW
EXECUTE FUNCTION validar_papeis_servico();

CREATE OR REPLACE FUNCTION validar_categoria_profissional()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = NEW.profissional_id AND perfil_tipo = 'profissional'
    ) THEN
        RAISE EXCEPTION 'profissional_id deve referenciar um usuario profissional';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_categoria_profissional
BEFORE INSERT OR UPDATE OF profissional_id ON profissional_categorias
FOR EACH ROW
EXECUTE FUNCTION validar_categoria_profissional();

INSERT INTO categorias (nome_servico) VALUES
    ('Hidráulica'),
    ('Elétrica'),
    ('TI'),
    ('Limpeza'),
    ('Construção'),
    ('Manutencao Rural'),
    ('Eletricista Rural'),
    ('Mecanica Agricola'),
    ('Fretes e Carretos'),
    ('Limpeza Pos-Obra'),
    ('Refrigeracao'),
    ('Jardinagem e Rocada')
ON CONFLICT (nome_servico) DO NOTHING;
