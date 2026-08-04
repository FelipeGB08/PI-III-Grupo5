const pool = require('../config/db');

const UploadClaimModel = {
    registrar: async ({ usuarioId, caminho }) => {
        const result = await pool.query(
            `INSERT INTO upload_claims (usuario_id, caminho)
             VALUES ($1, $2)
             ON CONFLICT (caminho) DO UPDATE SET usuario_id = EXCLUDED.usuario_id
             RETURNING id, caminho`,
            [usuarioId, caminho]
        );
        return result.rows[0];
    },
};

module.exports = UploadClaimModel;
