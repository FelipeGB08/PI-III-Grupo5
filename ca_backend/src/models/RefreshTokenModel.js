const pool = require('../config/db');

const RefreshTokenModel = {
    criar: async ({ usuarioId, tokenHash, expiraEm }) => {
        const result = await pool.query(
            `INSERT INTO refresh_tokens (usuario_id, token_hash, expira_em)
             VALUES ($1, $2, $3)
             RETURNING id, usuario_id, criado_em, expira_em`,
            [usuarioId, tokenHash, expiraEm]
        );
        return result.rows[0];
    },

    buscarValidoPorHash: async (tokenHash) => {
        const result = await pool.query(
            `SELECT u.id, u.nome, u.email, u.telefone, u.cidade_amauc,
                    u.endereco_principal, u.latitude, u.longitude,
                    u.perfil_tipo, u.foto_url, u.ativo, u.criado_em
             FROM refresh_tokens rt
             INNER JOIN usuarios u ON u.id = rt.usuario_id
             WHERE rt.token_hash = $1
               AND rt.revogado_em IS NULL
               AND rt.expira_em > NOW()
               AND u.ativo = TRUE
             LIMIT 1`,
            [tokenHash]
        );
        return result.rows[0];
    },

    revogarPorHash: async (tokenHash) => {
        const result = await pool.query(
            `UPDATE refresh_tokens
             SET revogado_em = COALESCE(revogado_em, NOW())
             WHERE token_hash = $1
             RETURNING id, usuario_id, revogado_em`,
            [tokenHash]
        );
        return result.rows[0];
    },
};

module.exports = RefreshTokenModel;
