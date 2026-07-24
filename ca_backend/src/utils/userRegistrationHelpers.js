const { cidadePermitida } = require('../config/amaucCidades');

const PERFIS_AUTOCADASTRO = new Set(['cidadao', 'profissional']);

function normalizarPerfilTipo(valor) {
    if (!valor) return null;
    const perfil = String(valor)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return PERFIS_AUTOCADASTRO.has(perfil) ? perfil : null;
}

function normalizarListaCidades(cidades) {
    if (!cidades) return [];
    const lista = Array.isArray(cidades)
        ? cidades
        : String(cidades)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

    const validadas = [];
    for (const cidade of lista) {
        const cidadeValidada = cidadePermitida(cidade);
        if (cidadeValidada && !validadas.includes(cidadeValidada)) {
            validadas.push(cidadeValidada);
        }
    }
    return validadas;
}

module.exports = {
    PERFIS_AUTOCADASTRO,
    normalizarListaCidades,
    normalizarPerfilTipo,
};
