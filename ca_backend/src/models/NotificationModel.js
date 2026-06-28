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
};

module.exports = NotificationModel;
