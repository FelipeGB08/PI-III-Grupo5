-- Mantém os perfis antigos pesquisáveis em todas as cidades atendidas.
UPDATE perfis_profissionais pp
SET cidades_atendidas = ARRAY[u.cidade_amauc]
FROM usuarios u
WHERE u.id = pp.usuario_id
  AND COALESCE(array_length(pp.cidades_atendidas, 1), 0) = 0
  AND u.cidade_amauc IS NOT NULL
  AND BTRIM(u.cidade_amauc) <> '';

-- Avaliações feitas por prestadores sobre clientes são privadas e independentes
-- das avaliações públicas feitas pelos clientes sobre prestadores.
CREATE TABLE IF NOT EXISTS avaliacoes_clientes (
    id SERIAL PRIMARY KEY,
    servico_id INTEGER NOT NULL UNIQUE REFERENCES servicos_solicitados(id) ON DELETE CASCADE,
    nota_estrelas INTEGER NOT NULL CHECK (nota_estrelas BETWEEN 1 AND 5),
    comentario TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_clientes_servico_id
    ON avaliacoes_clientes(servico_id);
