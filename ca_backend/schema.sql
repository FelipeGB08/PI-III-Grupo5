-- Schema do Conecta AMAUC (PostgreSQL)
-- Execute: npm run db:migrate

-- 1. Limpeza forçada: Destrói as tabelas velhas para aplicar a estrutura nova
DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS solicitacoes_orcamento CASCADE;
DROP TABLE IF EXISTS profissional_categorias CASCADE;
DROP TABLE IF EXISTS curriculos CASCADE;
DROP TABLE IF EXISTS perfil_profissional CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 2. Criação das tabelas atualizadas
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(30) NOT NULL CHECK (tipo_usuario IN ('cidadao', 'profissional', 'admin')),
    cidade VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT
);

CREATE TABLE perfil_profissional (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    bio TEXT NOT NULL,
    telefone_comercial VARCHAR(30) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE curriculos (
    id SERIAL PRIMARY KEY,
    profissional_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    biografia TEXT,
    anos_experiencia INTEGER DEFAULT 0
);

CREATE TABLE profissional_categorias (
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    PRIMARY KEY (profissional_id, categoria_id)
);

CREATE TABLE solicitacoes_orcamento (
    id SERIAL PRIMARY KEY,
    cidadao_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'recusado')),
    preco NUMERIC(10, 2),
    data_solicitacao TIMESTAMP DEFAULT NOW()
);

CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_orcamento(id) ON DELETE CASCADE,
    cidadao_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    profissional_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (solicitacao_id, cidadao_id)
);

-- 3. Carga inicial de categorias fixas
INSERT INTO categorias (nome, descricao) VALUES
    ('Hidráulica', 'Serviços de encanamento e hidráulica'),
    ('Elétrica', 'Instalações e reparos elétricos'),
    ('TI', 'Suporte técnico e informática'),
    ('Limpeza', 'Serviços de limpeza residencial e comercial'),
    ('Construção', 'Obras, reformas e construção civil')
ON CONFLICT (nome) DO NOTHING;