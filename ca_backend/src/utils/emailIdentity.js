function normalizarEmailIdentidade(email) {
    const valor = String(email || '').trim().toLowerCase();
    const separador = valor.lastIndexOf('@');

    if (separador <= 0 || separador === valor.length - 1) {
        return valor;
    }

    let parteLocal = valor.slice(0, separador);
    let dominio = valor.slice(separador + 1);

    // Para contas Gmail, pontos e sufixos "+..." não identificam uma nova
    // caixa postal. Armazenar a forma canônica impede cadastros duplicados.
    if (dominio === 'gmail.com' || dominio === 'googlemail.com') {
        parteLocal = parteLocal.split('+', 1)[0].replace(/\./g, '');
        dominio = 'gmail.com';
    }

    return `${parteLocal}@${dominio}`;
}

module.exports = { normalizarEmailIdentidade };
