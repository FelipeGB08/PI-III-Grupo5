const pool = require('../config/db');

const NotificationPreferenceModel = {
    buscarPreferencias: async (usuarioId) => {
        const result = await pool.query(
            `
            SELECT COALESCE(p.novos_horarios_favoritos, TRUE) AS novos_horarios_favoritos
            FROM usuarios u
            LEFT JOIN preferencias_notificacao p ON p.usuario_id = u.id
            WHERE u.id = $1
              AND u.ativo = TRUE
            LIMIT 1;
            `,
            [usuarioId]
        );

        return result.rows[0] || null;
    },

    atualizarNovosHorariosFavoritos: async ({ usuarioId, ativado }) => {
        const result = await pool.query(
            `
            INSERT INTO preferencias_notificacao (
                usuario_id,
                novos_horarios_favoritos,
                atualizado_em
            )
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (usuario_id)
            DO UPDATE SET
                novos_horarios_favoritos = EXCLUDED.novos_horarios_favoritos,
                atualizado_em = CURRENT_TIMESTAMP
            RETURNING novos_horarios_favoritos, atualizado_em;
            `,
            [usuarioId, ativado]
        );

        return result.rows[0] || null;
    },

    reservarNotificacaoDisponibilidade: async ({
        clienteId,
        profissionalId,
        janelaHoras = 6,
    }) => {
        const result = await pool.query(
            `
            INSERT INTO notificacoes_disponibilidade_favoritos (
                cliente_id,
                profissional_id,
                notificado_em
            )
            SELECT $1, $2, CURRENT_TIMESTAMP
            WHERE EXISTS (
                SELECT 1
                FROM usuarios u
                LEFT JOIN preferencias_notificacao p ON p.usuario_id = u.id
                WHERE u.id = $1
                  AND u.perfil_tipo = 'cidadao'
                  AND u.ativo = TRUE
                  AND COALESCE(p.novos_horarios_favoritos, TRUE) = TRUE
            )
            ON CONFLICT (cliente_id, profissional_id)
            DO UPDATE SET notificado_em = CURRENT_TIMESTAMP
            WHERE notificacoes_disponibilidade_favoritos.notificado_em
                <= CURRENT_TIMESTAMP - ($3 * INTERVAL '1 hour')
            RETURNING cliente_id, profissional_id, notificado_em;
            `,
            [clienteId, profissionalId, janelaHoras]
        );

        return result.rows[0] || null;
    },
};

module.exports = NotificationPreferenceModel;
