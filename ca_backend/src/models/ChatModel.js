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

    marcarMensagensComoLidas: async (servicoId, usuarioId) => {
        const resultado = await pool.query(
            `
            UPDATE chat_mensagens
            SET lida_em = CURRENT_TIMESTAMP
            WHERE servico_id = $1
              AND remetente_id <> $2
              AND lida_em IS NULL
            RETURNING id, lida_em;
            `,
            [servicoId, usuarioId]
        );

        if (resultado.rows.length === 0) return null;

        const ultimaMensagem = resultado.rows.reduce(
            (maior, atual) => Number(atual.id) > Number(maior.id) ? atual : maior
        );

        return {
            servico_id: Number(servicoId),
            leitor_id: Number(usuarioId),
            ate_mensagem_id: Number(ultimaMensagem.id),
            lida_em: ultimaMensagem.lida_em,
        };
    },

    listarMensagens: async (servicoId, usuarioId, { limit = 80, beforeId = null } = {}) => {
        const servico = await ChatModel.buscarServicoDoUsuario(servicoId, usuarioId);
        if (!servico) return null;

        const leitura = await ChatModel.marcarMensagensComoLidas(servicoId, usuarioId);

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

        return {
            mensagens: resultado.rows.reverse(),
            leitura,
        };
    },

    criarMensagem: async (servicoId, remetenteId, mensagem, clientId = null) => {
        const texto = String(mensagem || '').trim();
        if (!texto || texto.length > 1000) return null;

        const servico = await ChatModel.buscarServicoDoUsuario(servicoId, remetenteId);
        if (!servico) return null;

        const identificador = clientId ? String(clientId).trim() : null;
        if (
            identificador &&
            !/^[A-Za-z0-9_-]{16,64}$/.test(identificador)
        ) {
            return null;
        }
        const resultado = await pool.query(
            `
            WITH inserida AS (
                INSERT INTO chat_mensagens (
                    servico_id,
                    remetente_id,
                    mensagem,
                    client_id
                )
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (remetente_id, client_id) DO NOTHING
                RETURNING
                    id,
                    servico_id,
                    remetente_id,
                    mensagem,
                    lida_em,
                    criado_em,
                    TRUE AS criada
            )
            SELECT
                i.id,
                i.servico_id,
                i.remetente_id,
                (SELECT nome FROM usuarios WHERE id = i.remetente_id) AS remetente_nome,
                i.mensagem,
                i.lida_em,
                i.criado_em,
                i.criada
            FROM inserida i
            UNION ALL
            SELECT
                cm.id,
                cm.servico_id,
                cm.remetente_id,
                (SELECT nome FROM usuarios WHERE id = cm.remetente_id) AS remetente_nome,
                cm.mensagem,
                cm.lida_em,
                cm.criado_em,
                FALSE AS criada
            FROM chat_mensagens cm
            WHERE cm.remetente_id = $2
              AND cm.servico_id = $1
              AND cm.mensagem = $3
              AND cm.client_id = $4
              AND NOT EXISTS (SELECT 1 FROM inserida)
            LIMIT 1;
            `,
            [servicoId, remetenteId, texto, identificador]
        );

        const mensagemCriada = resultado.rows[0];
        if (!mensagemCriada) return null;

        const criada = mensagemCriada.criada !== false;
        delete mensagemCriada.criada;
        Object.defineProperty(mensagemCriada, '_criada', {
            value: criada,
            enumerable: false,
        });
        return mensagemCriada;
    },
};

module.exports = ChatModel;
