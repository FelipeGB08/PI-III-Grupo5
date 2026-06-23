const pool = require('../config/db');

const ServicoModel = {
    criar: async (cidadaoId, profId, descricao, fotoUrl, dadosAgenda = {}) => {
        const query = `
            INSERT INTO servicos_solicitados (
                cidadao_id,
                prof_id,
                agenda_servico_id,
                servico_nome,
                descricao,
                endereco_atendimento,
                agendado_para,
                foto_url,
                status,
                preco
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente', $9)
            RETURNING *;
        `;
        const resultado = await pool.query(query, [
            cidadaoId,
            profId,
            dadosAgenda.agenda_servico_id || null,
            dadosAgenda.servico_nome || null,
            descricao,
            dadosAgenda.endereco_atendimento || null,
            dadosAgenda.agendado_para || null,
            fotoUrl || null,
            dadosAgenda.preco || null,
        ]);
        return resultado.rows[0];
    },

    buscarPorId: async (id) => {
        const query = 'SELECT * FROM servicos_solicitados WHERE id = $1';
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    },

    buscarPorProfissional: async (profId, status = null) => {
        let query = `
            SELECT s.*, u.nome AS cidadao_nome, u.email AS cidadao_email
            FROM servicos_solicitados s
            JOIN usuarios u ON s.cidadao_id = u.id
            WHERE s.prof_id = $1
        `;
        const params = [profId];

        if (status) {
            query += ' AND s.status = $2';
            params.push(status);
        }

        query += ' ORDER BY s.criado_em DESC;';
        const resultado = await pool.query(query, params);
        return resultado.rows;
    },

    buscarPorCidadao: async (cidadaoId, status = null) => {
        let query = `
            SELECT s.*, u.nome AS profissional_nome
            FROM servicos_solicitados s
            JOIN usuarios u ON s.prof_id = u.id
            WHERE s.cidadao_id = $1
        `;
        const params = [cidadaoId];

        if (status) {
            query += ' AND s.status = $2';
            params.push(status);
        }

        query += ' ORDER BY s.criado_em DESC;';
        const resultado = await pool.query(query, params);
        return resultado.rows;
    },

    atualizarStatus: async (id, profId, status, preco) => {
        const statusPermitidos = ['pendente', 'aceito', 'recusado', 'concluido'];
        if (status && !statusPermitidos.includes(status)) {
            return null;
        }

        const query = `
            UPDATE servicos_solicitados
            SET status = COALESCE($1, status),
                preco = COALESCE($2, preco),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $3 AND prof_id = $4
            RETURNING *;
        `;
        const resultado = await pool.query(query, [status, preco, id, profId]);
        return resultado.rows[0];
    },
};

module.exports = ServicoModel;
