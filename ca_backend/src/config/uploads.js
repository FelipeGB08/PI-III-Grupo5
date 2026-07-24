const path = require('path');

const pastaUploads = path.resolve(
    process.env.UPLOADS_DIR || path.resolve(__dirname, '..', '..', 'uploads')
);
const pastaDocumentosVerificacao = path.resolve(
    process.env.VERIFICATION_DOCUMENTS_DIR ||
    path.resolve(__dirname, '..', '..', 'private_uploads', 'verificacoes')
);
const prefixoUrlUploads = '/uploads';
const prefixoDocumentoVerificacao = 'verificacoes/';

function criarUrlUpload(nomeArquivo) {
    return `${prefixoUrlUploads}/${nomeArquivo}`;
}

function criarReferenciaDocumentoVerificacao(nomeArquivo) {
    return `${prefixoDocumentoVerificacao}${nomeArquivo}`;
}

function nomeDocumentoVerificacao(referencia) {
    const valor = String(referencia || '').replace(/\\/g, '/');
    if (!valor.startsWith(prefixoDocumentoVerificacao)) return null;

    const nomeArquivo = path.posix.basename(valor);
    if (!/^[A-Za-z0-9-]+\.(?:jpg|png|webp)$/i.test(nomeArquivo)) return null;
    return nomeArquivo;
}

module.exports = {
    criarUrlUpload,
    criarReferenciaDocumentoVerificacao,
    nomeDocumentoVerificacao,
    pastaDocumentosVerificacao,
    pastaUploads,
    prefixoUrlUploads,
};
