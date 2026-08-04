const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_BYTES = 72;

function validarSenha(senha) {
    if (typeof senha !== 'string') {
        return 'Informe a senha.';
    }
    if (senha.length < MIN_PASSWORD_LENGTH) {
        return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (Buffer.byteLength(senha, 'utf8') > MAX_PASSWORD_BYTES) {
        return `A senha deve ter no maximo ${MAX_PASSWORD_BYTES} bytes.`;
    }
    return null;
}

module.exports = {
    MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
    validarSenha,
};
