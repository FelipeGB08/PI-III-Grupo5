-- Schema oficial do Conecta AMAUC (PostgreSQL)
-- Execute: npm run db:migrate

DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS servicos_solicitados CASCADE;
DROP TABLE IF EXISTS profissional_categorias CASCADE;
DROP TABLE IF EXISTS perfis_profissionais CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(30),
    cidade_amauc VARCHAR(100) NOT NULL,
    perfil_tipo VARCHAR(30) NOT NULL
        CHECK (perfil_tipo IN ('cidadao', 'profissional', 'admin')),
    foto_url VARCHAR(500),
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE perfis_profissionais (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    biografia TEXT,
    curriculo_texto TEXT,
    portfolio_url VARCHAR(500),
    anos_experiencia INTEGER DEFAULT 0,
    verificado BOOLEAN DEFAULT FALSE
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

CREATE TABLE servicos_solicitados (
    id SERIAL PRIMARY KEY,
    cidadao_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    prof_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    foto_url VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'aceito', 'recusado', 'concluido')),
    preco NUMERIC(10, 2),
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
    ('Construção')
ON CONFLICT (nome_servico) DO NOTHING;
