const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const {
    criarUrlUpload,
    pastaDocumentosVerificacao,
    pastaUploads,
} = require('../config/uploads');
const {
    jpegEstruturalmenteValido,
    pngEstruturalmenteValido,
    webpEstruturalmenteValido,
} = require('./imageValidationService');

const FORMATOS_SUPORTADOS = [
    {
        extensao: '.jpg',
        mimeType: 'image/jpeg',
        corresponde: jpegEstruturalmenteValido,
    },
    {
        extensao: '.png',
        mimeType: 'image/png',
        corresponde: pngEstruturalmenteValido,
    },
    {
        extensao: '.webp',
        mimeType: 'image/webp',
        corresponde: webpEstruturalmenteValido,
    },
];

const EXTENSOES_PERIGOSAS = new Set([
    '.apk', '.app', '.bat', '.bin', '.cmd', '.com', '.cjs', '.dll', '.exe',
    '.html', '.htm', '.jar', '.js', '.mjs', '.msi', '.php', '.phtml', '.ps1',
    '.scr', '.sh', '.svg', '.vbs', '.wsf',
]);

function identificarFormatoImagem(buffer) {
    if (!Buffer.isBuffer(buffer)) return null;
    return FORMATOS_SUPORTADOS.find((formato) => formato.corresponde(buffer)) || null;
}

function arquivosDaRequisicao(req) {
    if (Array.isArray(req.files)) return req.files;
    if (req.file) return [req.file];
    return [];
}

function nomeOriginalPossuiExtensaoPerigosa(nomeOriginal) {
    const nome = path.basename(String(nomeOriginal || '')).trim().toLowerCase();
    if (
        !nome ||
        nome.endsWith('.') ||
        nome.includes('..') ||
        /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(nome)
    ) {
        return true;
    }

    const extensoes = nome
        .split('.')
        .slice(1)
        .map((parte) => `.${parte}`);
    return extensoes.some((extensao) => EXTENSOES_PERIGOSAS.has(extensao));
}

const PASTAS_DE_UPLOAD_PERMITIDAS = [
    pastaUploads,
    pastaDocumentosVerificacao,
];

function caminhoDeUploadSeguro(caminhoArquivo) {
    if (!caminhoArquivo) return null;

    const caminhoResolvido = path.resolve(caminhoArquivo);
    return PASTAS_DE_UPLOAD_PERMITIDAS.some((pasta) => (
        caminhoResolvido.startsWith(`${pasta}${path.sep}`)
    ))
        ? caminhoResolvido
        : null;
}

async function removerArquivosDeUpload(arquivos) {
    await Promise.all((arquivos || []).map(async (arquivo) => {
        const caminhoArquivo = caminhoDeUploadSeguro(arquivo?.path);
        if (!caminhoArquivo) return;

        try {
            await fs.unlink(caminhoArquivo);
        } catch (erro) {
            if (erro.code !== 'ENOENT') throw erro;
        }
    }));
}

async function salvarImagemValidada(
    arquivo,
    formato,
    {
        directory = pastaUploads,
        urlFactory = criarUrlUpload,
    } = {}
) {
    const pastaDestino = path.resolve(directory);
    if (!PASTAS_DE_UPLOAD_PERMITIDAS.includes(pastaDestino)) {
        throw new Error('Diretorio de upload nao permitido.');
    }

    await fs.mkdir(pastaDestino, { recursive: true });

    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
        const filename = `${crypto.randomUUID()}${formato.extensao}`;
        const destino = path.join(pastaDestino, filename);

        try {
            await fs.writeFile(destino, arquivo.buffer, {
                flag: 'wx',
                mode: 0o640,
            });
            const { buffer, ...metadadosArquivo } = arquivo;
            return {
                ...metadadosArquivo,
                destination: pastaDestino,
                filename,
                mimetype: formato.mimeType,
                path: destino,
                size: arquivo.buffer.length,
                url: urlFactory(filename),
            };
        } catch (erro) {
            if (erro.code !== 'EEXIST' || tentativa === 2) throw erro;
        }
    }

    throw new Error('Nao foi possivel gerar nome seguro para a imagem.');
}

async function persistirImagensDaRequisicao(req, options = {}) {
    const arquivos = arquivosDaRequisicao(req);
    const validacoes = arquivos.map((arquivo) => ({
        arquivo,
        formato: identificarFormatoImagem(arquivo.buffer),
        extensaoPerigosa: nomeOriginalPossuiExtensaoPerigosa(arquivo.originalname),
    }));
    const invalido = validacoes.find(({ formato, extensaoPerigosa }) => (
        !formato || extensaoPerigosa
    ));

    if (invalido) {
        const erro = new Error(invalido.extensaoPerigosa
            ? 'Nome de arquivo com extensao nao permitida.'
            : 'Arquivo invalido. Envie uma imagem JPEG, PNG ou WEBP valida.');
        erro.status = 400;
        throw erro;
    }

    const arquivosSalvos = [];
    try {
        for (const validacao of validacoes) {
            arquivosSalvos.push(
                await salvarImagemValidada(
                    validacao.arquivo,
                    validacao.formato,
                    options
                )
            );
        }
    } catch (erro) {
        await removerArquivosDeUpload(arquivosSalvos);
        throw erro;
    }

    if (Array.isArray(req.files)) req.files = arquivosSalvos;
    if (req.file) req.file = arquivosSalvos[0];
    return arquivosSalvos;
}

module.exports = {
    arquivosDaRequisicao,
    identificarFormatoImagem,
    persistirImagensDaRequisicao,
    removerArquivosDeUpload,
};
