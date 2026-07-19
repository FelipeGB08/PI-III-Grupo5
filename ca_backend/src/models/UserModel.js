const pool = require('../config/db');
const crypto = require('crypto');
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
                   latitude, longitude, perfil_tipo, foto_url, ativo, excluido_em, criado_em
            FROM usuarios WHERE id = $1 AND ativo = TRUE
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    buscarAtivoPorId: async (id) => {
        const result = await pool.query(
            `SELECT id, perfil_tipo
             FROM usuarios
             WHERE id = $1 AND ativo = TRUE
             LIMIT 1`,
            [id]
        );
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
            WHERE id = $1 AND ativo = TRUE
            RETURNING id, nome, email, telefone, cidade_amauc, endereco_principal,
                      latitude, longitude, perfil_tipo, foto_url, ativo, excluido_em, criado_em
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
                      latitude, longitude, perfil_tipo, foto_url, ativo, excluido_em, criado_em;
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
                          latitude, longitude, perfil_tipo, foto_url, ativo, excluido_em, criado_em;
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
            WHERE id = $1 AND ativo = TRUE
            RETURNING id, nome, email, telefone, cidade_amauc, endereco_principal,
                      latitude, longitude, perfil_tipo, foto_url, ativo, excluido_em, criado_em;
        `;
        const result = await pool.query(query, [id, senhaHash]);
        return result.rows[0];
    },

    anonimizarConta: async ({ usuarioId, emailAnonimo }) => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const usuarioResult = await client.query(
                `SELECT foto_url
                 FROM usuarios
                 WHERE id = $1 AND ativo = TRUE
                 FOR UPDATE`,
                [usuarioId]
            );
            const usuario = usuarioResult.rows[0];
            if (!usuario) {
                await client.query('ROLLBACK');
                return null;
            }

            const arquivos = new Set([usuario.foto_url].filter(Boolean));
            const perfilResult = await client.query(
                `SELECT portfolio_url, portfolio_fotos
                 FROM perfis_profissionais
                 WHERE usuario_id = $1`,
                [usuarioId]
            );
            const perfil = perfilResult.rows[0];
            if (perfil?.portfolio_url) arquivos.add(perfil.portfolio_url);
            for (const foto of perfil?.portfolio_fotos || []) arquivos.add(foto);

            const fotosSolicitacaoResult = await client.query(
                `SELECT foto_url
                 FROM servicos_solicitados
                 WHERE cidadao_id = $1 AND foto_url IS NOT NULL`,
                [usuarioId]
            );
            for (const row of fotosSolicitacaoResult.rows) arquivos.add(row.foto_url);

            const fotosConclusaoResult = await client.query(
                `SELECT fotos_conclusao
                 FROM servicos_solicitados
                 WHERE prof_id = $1`,
                [usuarioId]
            );
            for (const row of fotosConclusaoResult.rows) {
                for (const foto of row.fotos_conclusao || []) arquivos.add(foto);
            }

            const refreshTokensResult = await client.query(
                `UPDATE refresh_tokens
                 SET revogado_em = COALESCE(revogado_em, NOW())
                 WHERE usuario_id = $1
                 RETURNING id`,
                [usuarioId]
            );

            await client.query(
                `UPDATE perfis_profissionais
                 SET biografia = NULL,
                     curriculo_texto = NULL,
                     portfolio_url = NULL,
                     portfolio_fotos = '{}',
                     certificacoes = '{}',
                     anos_experiencia = 0,
                     verificado = FALSE,
                     atende_rural = FALSE,
                     atende_emergencia = FALSE,
                     possui_veiculo = FALSE,
                     cidades_atendidas = '{}',
                     taxa_deslocamento = NULL
                 WHERE usuario_id = $1`,
                [usuarioId]
            );
            await client.query(
                `UPDATE profissional_agenda_servicos
                 SET ativo = FALSE
                 WHERE profissional_id = $1`,
                [usuarioId]
            );
            await client.query(
                `UPDATE servicos_solicitados
                 SET descricao = '[Descricao removida com a conta]',
                     endereco_atendimento = NULL,
                     foto_url = NULL
                 WHERE cidadao_id = $1`,
                [usuarioId]
            );
            await client.query(
                `UPDATE servicos_solicitados
                 SET fotos_conclusao = '{}'
                 WHERE prof_id = $1`,
                [usuarioId]
            );
            await client.query(
                `UPDATE avaliacoes a
                 SET comentario = NULL
                 FROM servicos_solicitados s
                 WHERE a.servico_id = s.id AND s.cidadao_id = $1`,
                [usuarioId]
            );
            await client.query(
                `UPDATE chat_mensagens
                 SET mensagem = '[Mensagem removida com a conta]'
                 WHERE remetente_id = $1`,
                [usuarioId]
            );
            await client.query(
                'DELETE FROM dispositivo_tokens WHERE usuario_id = $1',
                [usuarioId]
            );
            await client.query(
                'DELETE FROM notificacoes WHERE usuario_id = $1',
                [usuarioId]
            );
            await client.query(
                `DELETE FROM favoritos_profissionais
                 WHERE usuario_id = $1 OR profissional_id = $1`,
                [usuarioId]
            );

            const senhaInutil = crypto.randomBytes(48).toString('hex');
            const contaResult = await client.query(
                `UPDATE usuarios
                 SET nome = 'Usuário removido',
                     email = $2,
                     senha_hash = $3,
                     telefone = NULL,
                     cidade_amauc = 'Nao informado',
                     endereco_principal = NULL,
                     latitude = NULL,
                     longitude = NULL,
                     foto_url = NULL,
                     ativo = FALSE,
                     excluido_em = NOW()
                 WHERE id = $1 AND ativo = TRUE
                 RETURNING id, ativo, excluido_em`,
                [usuarioId, emailAnonimo, senhaInutil]
            );

            await client.query('COMMIT');
            return {
                conta: contaResult.rows[0],
                refreshTokensRevogados: refreshTokensResult.rowCount,
                arquivosParaRemover: [...arquivos],
            };
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    },
};

module.exports = UserModel;
