CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(30),
    cidade_amauc VARCHAR(100) NOT NULL,
    perfil_tipo VARCHAR(30) NOT NULL,
    foto_url VARCHAR(500),
    criado_em TIMESTAMP DEFAULT NOW()
);

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cidade_amauc VARCHAR(100),
    ADD COLUMN IF NOT EXISTS perfil_tipo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW();

ALTER TABLE usuarios
    DROP CONSTRAINT IF EXISTS usuarios_perfil_tipo_check,
    ADD CONSTRAINT usuarios_perfil_tipo_check
        CHECK (perfil_tipo IN ('cidadao', 'profissional', 'admin'));

CREATE TABLE IF NOT EXISTS perfis_profissionais (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    biografia TEXT,
    curriculo_texto TEXT,
    portfolio_url VARCHAR(500),
    anos_experiencia INTEGER DEFAULT 0,
    verificado BOOLEAN DEFAULT FALSE,
    atende_rural BOOLEAN NOT NULL DEFAULT FALSE,
    atende_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
    possui_veiculo BOOLEAN NOT NULL DEFAULT FALSE,
    cidades_atendidas TEXT[] NOT NULL DEFAULT '{}',
    taxa_deslocamento NUMERIC(10, 2)
);

ALTER TABLE perfis_profissionais
    ADD COLUMN IF NOT EXISTS biografia TEXT,
    ADD COLUMN IF NOT EXISTS curriculo_texto TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS anos_experiencia INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS atende_rural BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS atende_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS possui_veiculo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cidades_atendidas TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS taxa_deslocamento NUMERIC(10, 2);

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome_servico VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS profissional_categorias (
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    PRIMARY KEY (profissional_id, categoria_id)
);

CREATE TABLE IF NOT EXISTS profissional_agenda_servicos (
    id SERIAL PRIMARY KEY,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    duracao_minutos INTEGER NOT NULL DEFAULT 60 CHECK (duracao_minutos > 0),
    preco NUMERIC(10, 2) NOT NULL CHECK (preco > 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT NOW()
);

ALTER TABLE profissional_agenda_servicos
    ADD COLUMN IF NOT EXISTS profissional_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS nome VARCHAR(120),
    ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS profissional_agenda_horarios (
    id SERIAL PRIMARY KEY,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    horario TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (profissional_id, dia_semana, horario)
);

ALTER TABLE profissional_agenda_horarios
    ADD COLUMN IF NOT EXISTS profissional_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS dia_semana INTEGER,
    ADD COLUMN IF NOT EXISTS horario TIME,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS servicos_solicitados (
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
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    preco NUMERIC(10, 2),
    motivo_cancelamento TEXT,
    motivo_remarcacao TEXT,
    remarcacao_solicitada_para TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP
);

ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS agenda_servico_id INTEGER REFERENCES profissional_agenda_servicos(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS servico_nome VARCHAR(120),
    ADD COLUMN IF NOT EXISTS endereco_atendimento TEXT,
    ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMP,
    ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER,
    ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS preco NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
    ADD COLUMN IF NOT EXISTS motivo_remarcacao TEXT,
    ADD COLUMN IF NOT EXISTS remarcacao_solicitada_para TIMESTAMP,
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP;

ALTER TABLE servicos_solicitados
    DROP CONSTRAINT IF EXISTS servicos_solicitados_status_check,
    ADD CONSTRAINT servicos_solicitados_status_check
        CHECK (
            status IN (
                'pendente',
                'aceito',
                'recusado',
                'concluido',
                'cancelado_cliente',
                'remarcacao_solicitada'
            )
        );

CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    servico_id INTEGER NOT NULL UNIQUE REFERENCES servicos_solicitados(id) ON DELETE CASCADE,
    nota_estrelas INTEGER NOT NULL CHECK (nota_estrelas BETWEEN 1 AND 5),
    comentario TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

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

DROP TRIGGER IF EXISTS trg_validar_papeis_servico ON servicos_solicitados;
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

DROP TRIGGER IF EXISTS trg_validar_categoria_profissional ON profissional_categorias;
CREATE TRIGGER trg_validar_categoria_profissional
BEFORE INSERT OR UPDATE OF profissional_id ON profissional_categorias
FOR EACH ROW
EXECUTE FUNCTION validar_categoria_profissional();

INSERT INTO categorias (nome_servico) VALUES
    ('Hidraulica'),
    ('Eletrica'),
    ('TI'),
    ('Limpeza'),
    ('Construcao'),
    ('Manutencao Rural'),
    ('Eletricista Rural'),
    ('Mecanica Agricola'),
    ('Fretes e Carretos'),
    ('Limpeza Pos-Obra'),
    ('Refrigeracao'),
    ('Jardinagem e Rocada')
ON CONFLICT (nome_servico) DO NOTHING;
