const pool = require('../config/db');

const ProfissionalModel = {
    buscarPorFiltros: async (cidade, categoria) => {
        let query = `
            SELECT
                u.id,
                u.nome,
                u.email,
                u.telefone,
                u.cidade_amauc,
                pp.biografia,
                pp.curriculo_texto,
                pp.portfolio_url,
                pp.anos_experiencia,
                pp.verificado,
                COALESCE(
                    json_agg(DISTINCT c.nome_servico) FILTER (WHERE c.nome_servico IS NOT NULL),
                    '[]'
                ) AS categorias
            FROM usuarios u
            INNER JOIN perfis_profissionais pp ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            WHERE u.perfil_tipo = 'profissional'
        `;
        const valores = [];
        let indice = 1;

        if (cidade) {
            query += ` AND u.cidade_amauc = $${indice}`;
            valores.push(cidade);
            indice++;
        }

        if (categoria) {
            const categoriaNumerica = Number(categoria);
            if (!Number.isNaN(categoriaNumerica)) {
                query += ` AND pc.categoria_id = $${indice}`;
                valores.push(categoriaNumerica);
            } else {
                query += ` AND c.nome_servico ILIKE $${indice}`;
                valores.push(categoria);
            }
            indice++;
        }

        query += `
            GROUP BY u.id, pp.id
            ORDER BY pp.verificado DESC, u.nome ASC;
        `;

        const resultado = await pool.query(query, valores);
        return resultado.rows;
    },

    buscarPorId: async (id) => {
        const query = `
            SELECT
                u.id,
                u.nome,
                u.email,
                u.telefone,
                u.cidade_amauc,
                pp.biografia,
                pp.curriculo_texto,
                pp.portfolio_url,
                pp.anos_experiencia,
                pp.verificado,
                COALESCE(
                    json_agg(DISTINCT c.nome_servico) FILTER (WHERE c.nome_servico IS NOT NULL),
                    '[]'
                ) AS categorias
            FROM usuarios u
            INNER JOIN perfis_profissionais pp ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            WHERE u.id = $1 AND u.perfil_tipo = 'profissional'
            GROUP BY u.id, pp.id;
        `;
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    },
};

module.exports = ProfissionalModel;
