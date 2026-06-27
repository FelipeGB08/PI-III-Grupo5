const pool = require('../config/db');

const UserModel = {
    buscarPorEmail: async (email) => {
        const query = 'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    },

    buscarPorId: async (id) => {
        const query = `
            SELECT id, nome, email, telefone, cidade_amauc, perfil_tipo, foto_url, criado_em
            FROM usuarios WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    atualizarPerfil: async (id, { nome, telefone, foto_url }) => {
        const query = `
            UPDATE usuarios
            SET
                nome = COALESCE($2, nome),
                telefone = COALESCE($3, telefone),
                foto_url = COALESCE($4, foto_url)
            WHERE id = $1
            RETURNING id, nome, email, telefone, cidade_amauc, perfil_tipo, foto_url, criado_em
        `;
        const result = await pool.query(query, [id, nome, telefone, foto_url]);
        return result.rows[0];
    },

    criarUsuario: async (nome, email, senhaHash, telefone, cidadeAmauc, perfilTipo) => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const queryUsuario = `
                INSERT INTO usuarios (nome, email, senha_hash, telefone, cidade_amauc, perfil_tipo)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, nome, email, telefone, cidade_amauc, perfil_tipo, foto_url, criado_em;
            `;

            const values = [
                nome,
                email,
                senhaHash,
                telefone || null,
                cidadeAmauc,
                perfilTipo,
            ];

            const result = await client.query(queryUsuario, values);
            const novoUsuario = result.rows[0];

            if (perfilTipo === 'profissional') {
                await client.query(
                    `
                    INSERT INTO perfis_profissionais (usuario_id)
                    VALUES ($1)
                    ON CONFLICT (usuario_id) DO NOTHING;
                    `,
                    [novoUsuario.id]
                );
            }

            await client.query('COMMIT');

            return novoUsuario;
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    },

    atualizarSenha: async (id, senhaHash) => {
        const query = `
            UPDATE usuarios
            SET senha_hash = $2
            WHERE id = $1
            RETURNING id, nome, email, telefone, cidade_amauc, perfil_tipo, foto_url, criado_em;
        `;
        const result = await pool.query(query, [id, senhaHash]);
        return result.rows[0];
    },
};

module.exports = UserModel;