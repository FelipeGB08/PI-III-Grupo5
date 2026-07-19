const { cidadePermitida } = require('../config/amaucCidades');

function normalizarPerfilTipo(valor) {
    if (!valor) return null;
    const mapa = {
        cidadao: 'cidadao',
        cidadão: 'cidadao',
        profissional: 'profissional',
        admin: 'admin',
    };
    return mapa[String(valor).toLowerCase()] || null;
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
    normalizarListaCidades,
    normalizarPerfilTipo,
};
