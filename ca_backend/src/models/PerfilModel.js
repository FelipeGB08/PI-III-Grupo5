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
                verificado,
                atende_rural,
                atende_emergencia,
                possui_veiculo,
                cidades_atendidas,
                taxa_deslocamento
            )
            VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const values = [
            usuarioId,
            biografia,
            anosExperiencia || 0,
            curriculoTexto,
            portfolioUrl,
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
                atende_rural = COALESCE($6, atende_rural),
                atende_emergencia = COALESCE($7, atende_emergencia),
                possui_veiculo = COALESCE($8, possui_veiculo),
                cidades_atendidas = COALESCE($9, cidades_atendidas),
                taxa_deslocamento = COALESCE($10, taxa_deslocamento)
            WHERE usuario_id = $1
            RETURNING *;
        `;
        const values = [
            usuarioId,
            dados.biografia,
            dados.anos_experiencia,
            dados.curriculo_texto,
            dados.portfolio_url,
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

    listarTodos: async (filtros) => {
        let query = `
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
            query += ` AND (u.cidade_amauc = $${contador} OR $${contador} = ANY(pp.cidades_atendidas))`;
            values.push(filtros.cidade);
            contador++;
        }

        if (filtros.atende_rural === 'true') {
            query += ' AND pp.atende_rural = TRUE';
        }

        query += ' GROUP BY u.id, pp.id ORDER BY pp.verificado DESC, u.nome ASC;';
        const resultado = await pool.query(query, values);
        return resultado.rows;
    },
};

module.exports = PerfilModel;
