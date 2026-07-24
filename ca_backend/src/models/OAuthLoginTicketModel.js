const pool = require('../config/db');

const OAuthLoginTicketModel = {
    criar: async ({ usuarioId, tokenHash, stateHash, expiraEm }) => {
        const result = await pool.query(
            `INSERT INTO oauth_login_tickets (
                usuario_id,
                token_hash,
                state_hash,
                expira_em
            )
             VALUES ($1, $2, $3, $4)
             RETURNING id, usuario_id, criado_em, expira_em`,
            [usuarioId, tokenHash, stateHash, expiraEm]
        );
        return result.rows[0];
    },

    consumir: async ({ tokenHash, stateHash }) => {
        const result = await pool.query(
            `UPDATE oauth_login_tickets
             SET consumido_em = NOW()
             WHERE token_hash = $1
               AND state_hash = $2
               AND consumido_em IS NULL
               AND expira_em > NOW()
             RETURNING usuario_id`,
            [tokenHash, stateHash]
        );
        return result.rows[0];
    },
};

module.exports = OAuthLoginTicketModel;
