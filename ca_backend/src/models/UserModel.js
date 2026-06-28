const pool = require('../config/db');

function semAcento(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

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
        const query = `
            INSERT INTO usuarios (nome, email, senha_hash, telefone, cidade_amauc, perfil_tipo)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, nome, email, telefone, cidade_amauc, perfil_tipo, foto_url, criado_em;
        `;

        const result = await pool.query(query, [
            nome,
            email,
            senhaHash,
            telefone || null,
            cidadeAmauc,
            perfilTipo,
        ]);

        return result.rows[0];
    },

    criarUsuarioProfissionalCompleto: async ({
        nome,
        email,
        senhaHash,
        telefone,
        cidadeAmauc,
        biografia,
        categoriaNome,
        cidadesAtendidas,
    }) => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const usuarioResult = await client.query(
                `
                INSERT INTO usuarios (nome, email, senha_hash, telefone, cidade_amauc, perfil_tipo)
                VALUES ($1, $2, $3, $4, $5, 'profissional')
                RETURNING id, nome, email, telefone, cidade_amauc, perfil_tipo, foto_url, criado_em;
                `,
                [nome, email, senhaHash, telefone || null, cidadeAmauc]
            );

            const novoUsuario = usuarioResult.rows[0];

            await client.query(
                `
                INSERT INTO perfis_profissionais (
                    usuario_id,
                    biografia,
                    anos_experiencia,
                    curriculo_texto,
                    portfolio_url,
                    verificado,
                    atende_rural,
                    atende_emergencia,
                    possui_veiculo,
                    cidades_atendidas,
                    taxa_deslocamento
                )
                VALUES ($1, $2, 0, NULL, NULL, FALSE, FALSE, FALSE, FALSE, $3, NULL);
                `,
                [novoUsuario.id, biografia, cidadesAtendidas || [cidadeAmauc]]
            );

            if (categoriaNome) {
                const categoriaResult = await client.query(
                    `
                    SELECT id
                    FROM categorias
                    WHERE LOWER(nome_servico) IN (LOWER($1), LOWER($2))
                    LIMIT 1;
                    `,
                    [categoriaNome, semAcento(categoriaNome)]
                );

                if (!categoriaResult.rows[0]) {
                    throw new Error('Categoria profissional invalida.');
                }

                await client.query(
                    `
                    INSERT INTO profissional_categorias (profissional_id, categoria_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING;
                    `,
                    [novoUsuario.id, categoriaResult.rows[0].id]
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
