const pool = require('../config/db');

const PasswordTokenModel = {
    criar: async ({ usuarioId, tokenHash, finalidade, expiraEm }) => {
        await pool.query(
            `INSERT INTO recovery_tokens (usuario_id, token_hash, finalidade, expira_em)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (token_hash) DO NOTHING`,
            [usuarioId, tokenHash, finalidade, expiraEm]
        );
    },

    consumir: async ({ tokenHash, finalidade }) => {
        const result = await pool.query(
            `UPDATE recovery_tokens
             SET consumido_em = NOW()
             WHERE token_hash = $1
               AND finalidade = $2
               AND consumido_em IS NULL
               AND expira_em > NOW()
             RETURNING usuario_id`,
            [tokenHash, finalidade]
        );
        return result.rows[0] || null;
    },

    consumirResetEAtualizarSenha: async ({ tokenHash, senhaHash }) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const tokenResult = await client.query(
                `UPDATE recovery_tokens
                 SET consumido_em = NOW()
                 WHERE token_hash = $1
                   AND finalidade = 'password_reset'
                   AND consumido_em IS NULL
                   AND expira_em > NOW()
                 RETURNING usuario_id`,
                [tokenHash]
            );
            const token = tokenResult.rows[0];
            if (!token) {
                await client.query('ROLLBACK');
                return null;
            }

            const userResult = await client.query(
                `UPDATE usuarios
                 SET senha_hash = $2
                 WHERE id = $1 AND ativo = TRUE
                 RETURNING id`,
                [token.usuario_id, senhaHash]
            );
            if (!userResult.rows[0]) {
                await client.query('ROLLBACK');
                return null;
            }

            await client.query(
                `UPDATE refresh_tokens
                 SET revogado_em = COALESCE(revogado_em, NOW())
                 WHERE usuario_id = $1`,
                [token.usuario_id]
            );
            await client.query('COMMIT');
            return userResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    limparExpirados: async () => {
        await pool.query(
            `DELETE FROM recovery_tokens
             WHERE expira_em <= NOW()
                OR consumido_em < NOW() - INTERVAL '24 hours'`
        );
    },
};

module.exports = PasswordTokenModel;
