-- Schema oficial do Conecta AMAUC (PostgreSQL)
-- Execute: npm run db:migrate

DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS chat_mensagens CASCADE;
DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS dispositivo_tokens CASCADE;
DROP TABLE IF EXISTS profissional_agenda_horarios CASCADE;
DROP TABLE IF EXISTS profissional_agenda_servicos CASCADE;
DROP TABLE IF EXISTS servicos_solicitados CASCADE;
DROP TABLE IF EXISTS profissional_categorias CASCADE;
DROP TABLE IF EXISTS perfis_profissionais CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
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
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP
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
    mensagem TEXT NOT NULL,
    lida_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    CHECK (char_length(trim(mensagem)) BETWEEN 1 AND 1000)
);

CREATE INDEX idx_chat_mensagens_servico_criado
    ON chat_mensagens (servico_id, criado_em ASC);

CREATE INDEX idx_chat_mensagens_remetente
    ON chat_mensagens (remetente_id);

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
