const pool = require('../config/db');

const PerfilModel = {
    criarPerfil: async (
        usuarioId,
        biografia,
        anosExperiencia,
        curriculoTexto = null,
        portfolioUrl = null,
        regional = {}
    ) => {
        const query = `
            INSERT INTO perfis_profissionais (
                usuario_id,
                biografia,
                anos_experiencia,
                curriculo_texto,
                portfolio_url,
                portfolio_fotos,
                certificacoes,
                verificado,
                atende_rural,
                atende_emergencia,
                possui_veiculo,
                cidades_atendidas,
                taxa_deslocamento
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9, $10, $11, $12)
            RETURNING *;
        `;
        const values = [
            usuarioId,
            biografia,
            anosExperiencia || 0,
            curriculoTexto,
            portfolioUrl,
            regional.portfolio_fotos || [],
            regional.certificacoes || [],
            regional.atende_rural || false,
            regional.atende_emergencia || false,
            regional.possui_veiculo || false,
            regional.cidades_atendidas || [],
            regional.taxa_deslocamento ?? null,
        ];
        const resultado = await pool.query(query, values);
        return resultado.rows[0];
    },

    atualizarPerfil: async (usuarioId, dados) => {
        const query = `
            UPDATE perfis_profissionais
            SET
                biografia = COALESCE($2, biografia),
                anos_experiencia = COALESCE($3, anos_experiencia),
                curriculo_texto = COALESCE($4, curriculo_texto),
                portfolio_url = COALESCE($5, portfolio_url),
                portfolio_fotos = COALESCE($6, portfolio_fotos),
                certificacoes = COALESCE($7, certificacoes),
                atende_rural = COALESCE($8, atende_rural),
                atende_emergencia = COALESCE($9, atende_emergencia),
                possui_veiculo = COALESCE($10, possui_veiculo),
                cidades_atendidas = COALESCE($11, cidades_atendidas),
                taxa_deslocamento = COALESCE($12, taxa_deslocamento)
            WHERE usuario_id = $1
            RETURNING *;
        `;
        const values = [
            usuarioId,
            dados.biografia,
            dados.anos_experiencia,
            dados.curriculo_texto,
            dados.portfolio_url,
            dados.portfolio_fotos,
            dados.certificacoes,
            dados.atende_rural,
            dados.atende_emergencia,
            dados.possui_veiculo,
            dados.cidades_atendidas,
            dados.taxa_deslocamento,
        ];
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
            SELECT pp.*, u.nome, u.email, u.telefone, u.foto_url, u.cidade_amauc
            FROM perfis_profissionais pp
            JOIN usuarios u ON u.id = pp.usuario_id
            WHERE pp.usuario_id = $1;
        `;
        const resultado = await pool.query(query, [usuarioId]);
        return resultado.rows[0];
    },

    listarTodos: async (filtros, { limit = 20, offset = 0 } = {}) => {
        let fromWhere = `
            FROM perfis_profissionais pp
            JOIN usuarios u ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            WHERE u.perfil_tipo = 'profissional' AND u.ativo = TRUE
        `;
        const values = [];
        let contador = 1;

        if (filtros.categoria) {
            const categoriaNumerica = Number(filtros.categoria);
            if (!Number.isNaN(categoriaNumerica)) {
                fromWhere += ` AND pc.categoria_id = $${contador}`;
                values.push(categoriaNumerica);
            } else {
                fromWhere += ` AND c.nome_servico ILIKE $${contador}`;
                values.push(filtros.categoria);
            }
            contador++;
        }

        if (filtros.cidade) {
            fromWhere += ` AND (u.cidade_amauc = $${contador} OR $${contador} = ANY(pp.cidades_atendidas))`;
            values.push(filtros.cidade);
            contador++;
        }

        if (filtros.atende_rural === 'true') {
            fromWhere += ' AND pp.atende_rural = TRUE';
        }

        const totalResult = await pool.query(
            `SELECT COUNT(DISTINCT u.id) AS total ${fromWhere}`,
            values
        );

        const query = `
            SELECT
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
                COALESCE(
                    json_agg(DISTINCT c.nome_servico) FILTER (WHERE c.nome_servico IS NOT NULL),
                    '[]'
                ) AS categorias
            ${fromWhere}
            GROUP BY u.id, pp.id
            ORDER BY pp.verificado DESC, u.nome ASC
            LIMIT $${contador} OFFSET $${contador + 1};
        `;

        const resultado = await pool.query(query, [...values, limit, offset]);
        return {
            rows: resultado.rows,
            total: Number(totalResult.rows[0]?.total || 0),
        };
    },
};

module.exports = PerfilModel;
