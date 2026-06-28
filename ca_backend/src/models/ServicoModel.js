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
                duracao_minutos,
                foto_url,
                status,
                preco
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendente', $10)
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
            dadosAgenda.duracao_minutos || null,
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
        const statusPermitidos = [
            'pendente',
            'aceito',
            'recusado',
            'concluido',
            'cancelado_cliente',
            'remarcacao_solicitada',
        ];
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
        cancelarPeloCliente: async (id, cidadaoId, motivoCancelamento = null) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'cancelado_cliente',
                motivo_cancelamento = COALESCE($3, motivo_cancelamento),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status IN ('pendente', 'aceito', 'remarcacao_solicitada')
            RETURNING *;
        `;

        const resultado = await pool.query(query, [id, cidadaoId, motivoCancelamento]);
        return resultado.rows[0];
    },

    solicitarRemarcacao: async (id, profId, novaDataHora, motivoRemarcacao = null) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'remarcacao_solicitada',
                remarcacao_solicitada_para = $3,
                motivo_remarcacao = COALESCE($4, motivo_remarcacao),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND prof_id = $2
              AND status IN ('pendente', 'aceito')
            RETURNING *;
        `;

        const resultado = await pool.query(query, [
            id,
            profId,
            novaDataHora,
            motivoRemarcacao,
        ]);

        return resultado.rows[0];
    },

    aceitarRemarcacao: async (id, cidadaoId) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'aceito',
                agendado_para = remarcacao_solicitada_para,
                remarcacao_solicitada_para = NULL,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'remarcacao_solicitada'
              AND remarcacao_solicitada_para IS NOT NULL
            RETURNING *;
        `;

        const resultado = await pool.query(query, [id, cidadaoId]);
        return resultado.rows[0];
    },

    recusarRemarcacao: async (id, cidadaoId) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'aceito',
                remarcacao_solicitada_para = NULL,
                motivo_remarcacao = NULL,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'remarcacao_solicitada'
            RETURNING *;
        `;

        const resultado = await pool.query(query, [id, cidadaoId]);
        return resultado.rows[0];
    },
};

module.exports = ServicoModel;
