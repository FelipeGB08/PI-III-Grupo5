const pool = require('../config/db');

const NotificationModel = {
    salvarDeviceToken: async ({ usuarioId, token, plataforma }) => {
        const result = await pool.query(
            `
            INSERT INTO dispositivo_tokens (usuario_id, token, plataforma, ativo, atualizado_em)
            VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
            ON CONFLICT (token)
            DO UPDATE SET
                usuario_id = EXCLUDED.usuario_id,
                plataforma = EXCLUDED.plataforma,
                ativo = TRUE,
                atualizado_em = CURRENT_TIMESTAMP
            RETURNING *;
            `,
            [usuarioId, token, plataforma || null]
        );

        return result.rows[0];
    },

    desativarDeviceToken: async ({ usuarioId, token }) => {
        const result = await pool.query(
            `
            UPDATE dispositivo_tokens
            SET ativo = FALSE,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE usuario_id = $1
              AND token = $2
            RETURNING *;
            `,
            [usuarioId, token]
        );

        return result.rows[0] || null;
    },

    desativarTokenGlobal: async (token) => {
        const result = await pool.query(
            `
            UPDATE dispositivo_tokens
            SET ativo = FALSE,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE token = $1
            RETURNING *;
            `,
            [token]
        );

        return result.rows[0] || null;
    },

    buscarTokensAtivos: async (usuarioId) => {
        const result = await pool.query(
            `
            SELECT token
            FROM dispositivo_tokens
            WHERE usuario_id = $1
              AND ativo = TRUE
            ORDER BY atualizado_em DESC;
            `,
            [usuarioId]
        );

        return result.rows.map((row) => row.token);
    },

    listarNotificacoes: async ({ usuarioId, page = 1, limit = 20, somenteNaoLidas = false }) => {
        const pagina = Math.max(Number(page) || 1, 1);
        const limite = Math.min(Math.max(Number(limit) || 20, 1), 50);
        const offset = (pagina - 1) * limite;
        const filtros = ['usuario_id = $1'];
        const params = [usuarioId];

        if (somenteNaoLidas) {
            filtros.push('lida_em IS NULL');
        }

        const where = filtros.join(' AND ');
        const result = await pool.query(
            `
            SELECT id, usuario_id, tipo, titulo, corpo, payload, status, erro,
                   criado_em, enviada_em, lida_em
            FROM notificacoes
            WHERE ${where}
            ORDER BY criado_em DESC
            LIMIT $${params.length + 1}
            OFFSET $${params.length + 2};
            `,
            [...params, limite, offset]
        );

        const totalResult = await pool.query(
            `
            SELECT COUNT(*)::int AS total
            FROM notificacoes
            WHERE ${where};
            `,
            params
        );

        const naoLidasResult = await pool.query(
            `
            SELECT COUNT(*)::int AS total
            FROM notificacoes
            WHERE usuario_id = $1
              AND lida_em IS NULL;
            `,
            [usuarioId]
        );

        return {
            notificacoes: result.rows,
            page: pagina,
            limit: limite,
            total: totalResult.rows[0]?.total || 0,
            nao_lidas: naoLidasResult.rows[0]?.total || 0,
        };
    },

    criarNotificacao: async ({ usuarioId, tipo, titulo, corpo, payload }) => {
        const result = await pool.query(
            `
            INSERT INTO notificacoes (usuario_id, tipo, titulo, corpo, payload)
            VALUES ($1, $2, $3, $4, $5::jsonb)
            RETURNING *;
            `,
            [
                usuarioId,
                tipo,
                titulo,
                corpo,
                JSON.stringify(payload || {}),
            ]
        );

        return result.rows[0];
    },

    marcarEnviada: async (id) => {
        await pool.query(
            `
            UPDATE notificacoes
            SET status = 'enviada',
                enviada_em = CURRENT_TIMESTAMP,
                erro = NULL
            WHERE id = $1;
            `,
            [id]
        );
    },

    marcarFalha: async (id, erro) => {
        await pool.query(
            `
            UPDATE notificacoes
            SET status = 'falha',
                erro = $2
            WHERE id = $1;
            `,
            [id, String(erro || 'Falha desconhecida').slice(0, 500)]
        );
    },

    marcarLida: async ({ usuarioId, id }) => {
        const result = await pool.query(
            `
            UPDATE notificacoes
            SET lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP)
            WHERE usuario_id = $1
              AND id = $2
            RETURNING id, usuario_id, tipo, titulo, corpo, payload, status, erro,
                      criado_em, enviada_em, lida_em;
            `,
            [usuarioId, id]
        );

        return result.rows[0] || null;
    },

    marcarTodasLidas: async (usuarioId) => {
        const result = await pool.query(
            `
            UPDATE notificacoes
            SET lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP)
            WHERE usuario_id = $1
              AND lida_em IS NULL
            RETURNING id;
            `,
            [usuarioId]
        );

        return result.rowCount;
    },
};

module.exports = NotificationModel;
