const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
const {
    pastaUploads,
    prefixoUrlUploads,
} = require('../src/config/uploads');

const PADRAO_EMAIL_E2E =
    '^(cidadao|intruso|profissional)[.]e2e[.][0-9]+@amauc[.]com$';
const PADRAO_DESCRICAO_E2E = 'Fluxo E2E:%';
const PADRAO_ARQUIVO_E2E_ANTIGO =
    /^[a-f0-9]{32}-evidencia-e2e[.](?:jpe?g|png|webp)$/i;

function hostLocal(url) {
    try {
        return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
    } catch (_) {
        return false;
    }
}

function configuracaoBanco(env = process.env) {
    if (env.E2E_DATABASE_URL) {
        return { connectionString: env.E2E_DATABASE_URL };
    }

    if (env.DATABASE_URL) {
        return { connectionString: env.DATABASE_URL };
    }

    return {
        host: env.DB_HOST || 'localhost',
        port: Number(env.DB_PORT) || 5432,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
    };
}

function bancoLocal(config) {
    if (config.connectionString) return hostLocal(config.connectionString);
    return ['localhost', '127.0.0.1', '::1'].includes(config.host);
}

function criarContextoLimpeza({ apiBaseUrl, env = process.env } = {}) {
    const banco = configuracaoBanco(env);
    if (!hostLocal(apiBaseUrl) || !bancoLocal(banco)) {
        throw new Error(
            'O E2E so executa contra API e PostgreSQL locais/isolados para garantir a limpeza. '
            + 'Nao use API_BASE_URL ou E2E_DATABASE_URL remotos.'
        );
    }

    return {
        banco,
        userIds: new Set(),
        emails: new Set(),
        uploadUrls: new Set(),
    };
}

function registrarUsuario(contexto, usuario, email) {
    if (Number.isInteger(Number(usuario?.id))) contexto.userIds.add(Number(usuario.id));
    if (email) contexto.emails.add(String(email).trim().toLowerCase());
}

function registrarUpload(contexto, urls = []) {
    for (const url of urls) {
        if (typeof url === 'string' && url.startsWith(`${prefixoUrlUploads}/`)) {
            contexto.uploadUrls.add(url);
        }
    }
}

function caminhoUploadSeguro(url, uploadsDir = pastaUploads) {
    const pathname = new URL(url, 'http://localhost').pathname;
    if (!pathname.startsWith(`${prefixoUrlUploads}/`)) return null;

    const nome = path.basename(pathname);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(nome)) return null;

    const base = path.resolve(uploadsDir);
    const candidato = path.resolve(base, nome);
    return candidato.startsWith(`${base}${path.sep}`) ? candidato : null;
}

async function removerArquivos(contexto, {
    unlink = fs.unlink,
    uploadsDir = pastaUploads,
} = {}) {
    let removidos = 0;
    for (const url of contexto.uploadUrls) {
        const arquivo = caminhoUploadSeguro(url, uploadsDir);
        if (!arquivo) continue;
        try {
            await unlink(arquivo);
            removidos += 1;
        } catch (erro) {
            if (erro.code !== 'ENOENT') throw erro;
        }
    }
    return removidos;
}

async function removerArquivosOrfaosE2E({
    readdir = fs.readdir,
    unlink = fs.unlink,
    uploadsDir = pastaUploads,
} = {}) {
    let nomes;
    try {
        nomes = await readdir(uploadsDir);
    } catch (erro) {
        if (erro.code === 'ENOENT') return 0;
        throw erro;
    }

    let removidos = 0;
    for (const nome of nomes) {
        if (!PADRAO_ARQUIVO_E2E_ANTIGO.test(nome)) continue;

        const arquivo = caminhoUploadSeguro(
            `${prefixoUrlUploads}/${nome}`,
            uploadsDir
        );
        if (!arquivo) continue;

        try {
            await unlink(arquivo);
            removidos += 1;
        } catch (erro) {
            if (erro.code !== 'ENOENT') throw erro;
        }
    }
    return removidos;
}

async function removerDadosBanco(contexto, {
    createClient = (config) => new Client(config),
} = {}) {
    const client = createClient(contexto.banco);
    await client.connect();

    try {
        await client.query('BEGIN');
        const encontrados = await client.query(
            `SELECT id
             FROM usuarios
             WHERE id = ANY($1::integer[]) OR LOWER(email) = ANY($2::text[])`,
            [[...contexto.userIds], [...contexto.emails]]
        );
        const ids = encontrados.rows.map((row) => Number(row.id)).filter(Number.isInteger);

        if (ids.length > 0) {
            await client.query('DELETE FROM usuarios WHERE id = ANY($1::integer[])', [ids]);
        }
        await client.query('COMMIT');
        return ids.length;
    } catch (erro) {
        await client.query('ROLLBACK');
        throw erro;
    } finally {
        await client.end();
    }
}

async function limparResiduosAnterioresE2E(contexto, {
    createClient = (config) => new Client(config),
    readdir = fs.readdir,
    unlink = fs.unlink,
    uploadsDir = pastaUploads,
} = {}) {
    const client = createClient(contexto.banco);
    const arquivosEncontrados = [];
    let ids = [];

    await client.connect();
    try {
        await client.query('BEGIN');
        const encontrados = await client.query(
            `WITH usuarios_marcados AS (
                 SELECT id
                 FROM usuarios
                 WHERE LOWER(email) ~ $1
             ),
             usuarios_relacionados AS (
                 SELECT cidadao_id AS id
                 FROM servicos_solicitados
                 WHERE prof_id IN (SELECT id FROM usuarios_marcados)
                    OR cidadao_id IN (SELECT id FROM usuarios_marcados)
                    OR descricao LIKE $2
                 UNION
                 SELECT prof_id AS id
                 FROM servicos_solicitados
                 WHERE prof_id IN (SELECT id FROM usuarios_marcados)
                    OR cidadao_id IN (SELECT id FROM usuarios_marcados)
                    OR descricao LIKE $2
             )
             SELECT DISTINCT id
             FROM (
                 SELECT id FROM usuarios_marcados
                 UNION
                 SELECT id FROM usuarios_relacionados
             ) residuos
             WHERE id IS NOT NULL`,
            [PADRAO_EMAIL_E2E, PADRAO_DESCRICAO_E2E]
        );
        ids = encontrados.rows
            .map((row) => Number(row.id))
            .filter(Number.isInteger);

        if (ids.length > 0) {
            const uploads = await client.query(
                `SELECT foto_url, fotos_conclusao
                 FROM servicos_solicitados
                 WHERE cidadao_id = ANY($1::integer[])
                    OR prof_id = ANY($1::integer[])`,
                [ids]
            );
            for (const row of uploads.rows) {
                if (row.foto_url) arquivosEncontrados.push(row.foto_url);
                if (Array.isArray(row.fotos_conclusao)) {
                    arquivosEncontrados.push(...row.fotos_conclusao);
                }
            }

            await client.query(
                'DELETE FROM usuarios WHERE id = ANY($1::integer[])',
                [ids]
            );
        }

        await client.query('COMMIT');
    } catch (erro) {
        await client.query('ROLLBACK');
        throw erro;
    } finally {
        await client.end();
    }

    const contextoArquivos = { uploadUrls: new Set() };
    registrarUpload(contextoArquivos, arquivosEncontrados);
    const arquivosReferenciadosRemovidos = await removerArquivos(contextoArquivos, {
        unlink,
        uploadsDir,
    });
    const arquivosOrfaosRemovidos = await removerArquivosOrfaosE2E({
        readdir,
        unlink,
        uploadsDir,
    });

    return {
        usuariosRemovidos: ids.length,
        arquivosRemovidos:
            arquivosReferenciadosRemovidos + arquivosOrfaosRemovidos,
    };
}

async function limparResiduosE2E(contexto, dependencias = {}) {
    const usuariosRemovidos = await removerDadosBanco(contexto, dependencias);
    const arquivosRemovidos = await removerArquivos(contexto, dependencias);
    return { usuariosRemovidos, arquivosRemovidos };
}

module.exports = {
    bancoLocal,
    caminhoUploadSeguro,
    configuracaoBanco,
    criarContextoLimpeza,
    limparResiduosAnterioresE2E,
    limparResiduosE2E,
    registrarUpload,
    registrarUsuario,
    removerArquivos,
    removerArquivosOrfaosE2E,
    removerDadosBanco,
};
