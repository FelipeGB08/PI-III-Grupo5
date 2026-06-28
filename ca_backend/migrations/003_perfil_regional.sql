ALTER TABLE perfis_profissionais
    ADD COLUMN IF NOT EXISTS atende_rural BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS atende_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS possui_veiculo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cidades_atendidas TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS taxa_deslocamento NUMERIC(10, 2);

INSERT INTO categorias (nome_servico) VALUES
    ('Manutencao Rural'),
    ('Eletricista Rural'),
    ('Mecanica Agricola'),
    ('Fretes e Carretos'),
    ('Limpeza Pos-Obra'),
    ('Refrigeracao'),
    ('Jardinagem e Rocada')
ON CONFLICT (nome_servico) DO NOTHING;
