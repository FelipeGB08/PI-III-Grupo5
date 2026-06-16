const pool = require('../config/db');

const PerfilModel = {
    criarPerfil: async (usuarioId, biografia, anosExperiencia) => {
        const query = `
            INSERT INTO perfis_profissionais (usuario_id, biografia, anos_experiencia, verificado)
            VALUES ($1, $2, $3, FALSE)
            RETURNING *;
        `;
        const values = [usuarioId, biografia, anosExperiencia || 0];
        const resultado = await pool.query(query, values);
        return resultado.rows[0];
    },

    vincularCategoria: async (profissionalId, categoriaId) => {
        const query = `
            INSERT INTO profissional_categorias (profissional_id, categoria_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING;
        `;
        await pool.query(query, [profissionalId, categoriaId]);
    },

    buscarPorUsuarioId: async (usuarioId) => {
        const query = `
            SELECT pp.*, u.nome, u.email, u.telefone, u.cidade_amauc
            FROM perfis_profissionais pp
            JOIN usuarios u ON u.id = pp.usuario_id
            WHERE pp.usuario_id = $1;
        `;
        const resultado = await pool.query(query, [usuarioId]);
        return resultado.rows[0];
    },

    listarTodos: async (filtros) => {
        let query = `
            SELECT
                u.id,
                u.nome,
                u.email,
                u.telefone,
                u.cidade_amauc,
                pp.biografia,
                pp.anos_experiencia,
                pp.verificado,
                COALESCE(
                    json_agg(DISTINCT c.nome_servico) FILTER (WHERE c.nome_servico IS NOT NULL),
                    '[]'
                ) AS categorias
            FROM perfis_profissionais pp
            JOIN usuarios u ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            WHERE u.perfil_tipo = 'profissional'
        `;
        const values = [];
        let contador = 1;

        if (filtros.categoria) {
            const categoriaNumerica = Number(filtros.categoria);
            if (!Number.isNaN(categoriaNumerica)) {
                query += ` AND pc.categoria_id = $${contador}`;
                values.push(categoriaNumerica);
            } else {
                query += ` AND c.nome_servico ILIKE $${contador}`;
                values.push(filtros.categoria);
            }
            contador++;
        }

        if (filtros.cidade) {
            query += ` AND u.cidade_amauc = $${contador}`;
            values.push(filtros.cidade);
            contador++;
        }

        query += ' GROUP BY u.id, pp.id ORDER BY u.nome ASC;';
        const resultado = await pool.query(query, values);
        return resultado.rows;
    },
};

module.exports = PerfilModel;
