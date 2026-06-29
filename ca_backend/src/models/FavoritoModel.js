const pool = require('../config/db');
const {
    coordenadasCidade,
    distanciaKm,
} = require('../config/amaucCidades');

const CAMPOS_FAVORITO = `
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.foto_url,
    u.cidade_amauc,
    pp.biografia,
    pp.curriculo_texto,
    pp.portfolio_url,
    pp.portfolio_fotos,
    pp.certificacoes,
    pp.anos_experiencia,
    pp.verificado,
    pp.atende_rural,
    pp.atende_emergencia,
    pp.possui_veiculo,
    pp.cidades_atendidas,
    pp.taxa_deslocamento,
    f.criado_em AS favoritado_em,
    COALESCE(ROUND(AVG(a.nota_estrelas), 1), 0) AS media_avaliacao,
    COUNT(DISTINCT CASE WHEN s.status = 'concluido' THEN s.id END) AS total_servicos,
    COUNT(DISTINCT CASE WHEN a.nota_estrelas >= 4 THEN a.id END) AS avaliacoes_positivas,
    COALESCE(
        json_agg(DISTINCT c.nome_servico) FILTER (WHERE c.nome_servico IS NOT NULL),
        '[]'
    ) AS categorias
`;

function comDistancia(row, origem = null) {
    const coords = coordenadasCidade(row.cidade_amauc);
    return {
        ...row,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        distancia_km: distanciaKm(origem, coords),
    };
}

const FavoritoModel = {
    listar: async ({ usuarioId, lat = null, lng = null }) => {
        const result = await pool.query(
            `
            SELECT ${CAMPOS_FAVORITO}
            FROM favoritos_profissionais f
            JOIN usuarios u ON u.id = f.profissional_id
            JOIN perfis_profissionais pp ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            LEFT JOIN servicos_solicitados s ON s.prof_id = u.id
            LEFT JOIN avaliacoes a ON a.servico_id = s.id
            WHERE f.usuario_id = $1
              AND u.perfil_tipo = 'profissional'
            GROUP BY f.id, u.id, pp.id
            ORDER BY f.criado_em DESC;
            `,
            [usuarioId]
        );

        const origem = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
        return result.rows.map((row) => comDistancia(row, origem));
    },

    ids: async (usuarioId) => {
        const result = await pool.query(
            `
            SELECT profissional_id
            FROM favoritos_profissionais
            WHERE usuario_id = $1
            ORDER BY criado_em DESC;
            `,
            [usuarioId]
        );

        return result.rows.map((row) => row.profissional_id);
    },

    adicionar: async ({ usuarioId, profissionalId }) => {
        const result = await pool.query(
            `
            INSERT INTO favoritos_profissionais (usuario_id, profissional_id)
            SELECT $1, $2
            WHERE EXISTS (
                SELECT 1
                FROM usuarios
                WHERE id = $2
                  AND perfil_tipo = 'profissional'
            )
            ON CONFLICT (usuario_id, profissional_id) DO NOTHING
            RETURNING *;
            `,
            [usuarioId, profissionalId]
        );

        if (result.rows[0]) return result.rows[0];

        const existente = await pool.query(
            `
            SELECT *
            FROM favoritos_profissionais
            WHERE usuario_id = $1
              AND profissional_id = $2;
            `,
            [usuarioId, profissionalId]
        );

        return existente.rows[0] || null;
    },

    remover: async ({ usuarioId, profissionalId }) => {
        const result = await pool.query(
            `
            DELETE FROM favoritos_profissionais
            WHERE usuario_id = $1
              AND profissional_id = $2
            RETURNING *;
            `,
            [usuarioId, profissionalId]
        );

        return result.rows[0] || null;
    },

    existeProfissional: async (profissionalId) => {
        const result = await pool.query(
            `
            SELECT 1
            FROM usuarios
            WHERE id = $1
              AND perfil_tipo = 'profissional';
            `,
            [profissionalId]
        );

        return result.rowCount > 0;
    },
};

module.exports = FavoritoModel;
