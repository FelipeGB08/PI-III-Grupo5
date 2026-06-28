const pool = require('../config/db');

const ChatModel = {
    buscarServicoDoUsuario: async (servicoId, usuarioId) => {
        const resultado = await pool.query(
            `
            SELECT s.*, c.nome AS cidadao_nome, p.nome AS profissional_nome
            FROM servicos_solicitados s
            JOIN usuarios c ON c.id = s.cidadao_id
            JOIN usuarios p ON p.id = s.prof_id
            WHERE s.id = $1
              AND (s.cidadao_id = $2 OR s.prof_id = $2);
            `,
            [servicoId, usuarioId]
        );
        return resultado.rows[0];
    },

    listarMensagens: async (servicoId, usuarioId, { limit = 80, beforeId = null } = {}) => {
        const servico = await ChatModel.buscarServicoDoUsuario(servicoId, usuarioId);
        if (!servico) return null;

        const params = [servicoId, Math.min(100, Math.max(1, Number(limit) || 80))];
        let filtroAntes = '';
        if (beforeId) {
            params.push(beforeId);
            filtroAntes = ` AND cm.id < $${params.length}`;
        }

        const resultado = await pool.query(
            `
            SELECT
                cm.id,
                cm.servico_id,
                cm.remetente_id,
                u.nome AS remetente_nome,
                cm.mensagem,
                cm.lida_em,
                cm.criado_em
            FROM chat_mensagens cm
            JOIN usuarios u ON u.id = cm.remetente_id
            WHERE cm.servico_id = $1
              ${filtroAntes}
            ORDER BY cm.id DESC
            LIMIT $2;
            `,
            params
        );

        return resultado.rows.reverse();
    },

    criarMensagem: async (servicoId, remetenteId, mensagem) => {
        const texto = String(mensagem || '').trim();
        if (!texto || texto.length > 1000) return null;

        const servico = await ChatModel.buscarServicoDoUsuario(servicoId, remetenteId);
        if (!servico) return null;

        const resultado = await pool.query(
            `
            INSERT INTO chat_mensagens (servico_id, remetente_id, mensagem)
            VALUES ($1, $2, $3)
            RETURNING
                id,
                servico_id,
                remetente_id,
                (SELECT nome FROM usuarios WHERE id = $2) AS remetente_nome,
                mensagem,
                lida_em,
                criado_em;
            `,
            [servicoId, remetenteId, texto]
        );

        return resultado.rows[0];
    },
};

module.exports = ChatModel;
