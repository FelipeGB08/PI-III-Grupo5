const crypto = require('crypto');

const magicLinkTokens = new Map();
const passwordResetTokens = new Map();

function ambienteDesenvolvimento() {
    return process.env.NODE_ENV !== 'production';
}

function gerarTokenSeguro() {
    return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function expiraEmMinutos(minutos) {
    return Date.now() + minutos * 60 * 1000;
}

function limparExpirados(store) {
    const agora = Date.now();
    for (const [hash, dados] of store.entries()) {
        if (dados.expiraEm <= agora) {
            store.delete(hash);
        }
    }
}

module.exports = {
    ambienteDesenvolvimento,
    expiraEmMinutos,
    gerarTokenSeguro,
    hashToken,
    limparExpirados,
    magicLinkTokens,
    passwordResetTokens,
};
