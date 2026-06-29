const pool = require('../config/db');
const { coordenadasCidade } = require('../config/amaucCidades');

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
            SELECT id, nome, email, telefone, cidade_amauc, endereco_principal,
                   latitude, longitude, perfil_tipo, foto_url, criado_em
            FROM usuarios WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    atualizarPerfil: async (
        id,
        { nome, telefone, foto_url, endereco_principal, latitude, longitude }
    ) => {
        const query = `
            UPDATE usuarios
            SET
                nome = COALESCE($2, nome),
                telefone = COALESCE($3, telefone),
                foto_url = COALESCE($4, foto_url),
                endereco_principal = COALESCE($5, endereco_principal),
                latitude = COALESCE($6, latitude),
                longitude = COALESCE($7, longitude)
            WHERE id = $1
            RETURNING id, nome, email, telefone, cidade_amauc, endereco_principal,
                      latitude, longitude, perfil_tipo, foto_url, criado_em
        `;
        const result = await pool.query(query, [
            id,
            nome,
            telefone,
            foto_url,
            endereco_principal,
            latitude,
            longitude,
        ]);
        return result.rows[0];
    },

    criarUsuario: async (
        nome,
        email,
        senhaHash,
        telefone,
        cidadeAmauc,
        perfilTipo,
        localizacao = {}
    ) => {
        const coords = coordenadasCidade(cidadeAmauc) || {};
        const latitude = localizacao.latitude ?? coords.lat ?? null;
        const longitude = localizacao.longitude ?? coords.lng ?? null;
        const query = `
            INSERT INTO usuarios (
                nome,
                email,
                senha_hash,
                telefone,
                cidade_amauc,
                endereco_principal,
                latitude,
                longitude,
                perfil_tipo
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, nome, email, telefone, cidade_amauc, endereco_principal,
                      latitude, longitude, perfil_tipo, foto_url, criado_em;
        `;

        const result = await pool.query(query, [
            nome,
            email,
            senhaHash,
            telefone || null,
            cidadeAmauc,
            localizacao.endereco_principal || null,
            latitude,
            longitude,
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
        enderecoPrincipal,
        latitude,
        longitude,
    }) => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const coords = coordenadasCidade(cidadeAmauc) || {};
            const usuarioResult = await client.query(
                `
                INSERT INTO usuarios (
                    nome,
                    email,
                    senha_hash,
                    telefone,
                    cidade_amauc,
                    endereco_principal,
                    latitude,
                    longitude,
                    perfil_tipo
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'profissional')
                RETURNING id, nome, email, telefone, cidade_amauc, endereco_principal,
                          latitude, longitude, perfil_tipo, foto_url, criado_em;
                `,
                [
                    nome,
                    email,
                    senhaHash,
                    telefone || null,
                    cidadeAmauc,
                    enderecoPrincipal || null,
                    latitude ?? coords.lat ?? null,
                    longitude ?? coords.lng ?? null,
                ]
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
            RETURNING id, nome, email, telefone, cidade_amauc, endereco_principal,
                      latitude, longitude, perfil_tipo, foto_url, criado_em;
        `;
        const result = await pool.query(query, [id, senhaHash]);
        return result.rows[0];
    },
};

module.exports = UserModel;
