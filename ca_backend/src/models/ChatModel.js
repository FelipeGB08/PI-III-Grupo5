const pool = require('../config/db');

const ChatModel = {
    listarConversas: async (usuarioId) => {
        const resultado = await pool.query(
            `
            SELECT
                s.id AS servico_id,
                s.status,
                s.servico_nome,
                s.descricao,
                s.preco,
                s.agendado_para,
                s.endereco_atendimento,
                s.criado_em AS servico_criado_em,
                s.atualizado_em AS servico_atualizado_em,
                outro.id AS outro_usuario_id,
                outro.nome AS outro_usuario_nome,
                outro.email AS outro_usuario_email,
                outro.foto_url AS outro_usuario_foto_url,
                outro.perfil_tipo AS outro_usuario_tipo,
                ultima.mensagem AS ultima_mensagem,
                ultima.criado_em AS ultima_mensagem_em,
                COALESCE(nao_lidas.total, 0)::int AS nao_lidas
            FROM servicos_solicitados s
            JOIN usuarios outro
              ON outro.id = CASE
                  WHEN s.cidadao_id = $1 THEN s.prof_id
                  ELSE s.cidadao_id
              END
            LEFT JOIN LATERAL (
                SELECT cm.mensagem, cm.criado_em
                FROM chat_mensagens cm
                WHERE cm.servico_id = s.id
                ORDER BY cm.id DESC
                LIMIT 1
            ) ultima ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS total
                FROM chat_mensagens cm
                WHERE cm.servico_id = s.id
                  AND cm.remetente_id <> $1
                  AND cm.lida_em IS NULL
            ) nao_lidas ON TRUE
            WHERE s.cidadao_id = $1 OR s.prof_id = $1
            ORDER BY COALESCE(ultima.criado_em, s.atualizado_em, s.criado_em) DESC;
            `,
            [usuarioId]
        );

        return resultado.rows;
    },

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

    buscarDestinatarioMensagem: async (servicoId, remetenteId) => {
        const servico = await ChatModel.buscarServicoDoUsuario(servicoId, remetenteId);
        if (!servico) return null;

        return Number(servico.cidadao_id) === Number(remetenteId)
            ? servico.prof_id
            : servico.cidadao_id;
    },

    listarMensagens: async (servicoId, usuarioId, { limit = 80, beforeId = null } = {}) => {
        const servico = await ChatModel.buscarServicoDoUsuario(servicoId, usuarioId);
        if (!servico) return null;

        await pool.query(
            `
            UPDATE chat_mensagens
            SET lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP)
            WHERE servico_id = $1
              AND remetente_id <> $2
              AND lida_em IS NULL;
            `,
            [servicoId, usuarioId]
        );

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
