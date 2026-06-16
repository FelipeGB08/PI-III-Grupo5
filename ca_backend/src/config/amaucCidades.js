/**
 * RF01 — Geofencing: 14 municípios da região AMAUC (Alto Uruguai Catarinense).
 * Cadastro restrito exclusivamente a estas cidades.
 */
const CIDADES_AMAUC = [
    'Arabutã',
    'Arvoredo',
    'Concórdia',
    'Ipira',
    'Ipumirim',
    'Irani',
    'Itá',
    'Lindóia do Sul',
    'Paial',
    'Peritiba',
    'Piratuba',
    'Presidente Castello Branco',
    'Seara',
    'Xavantina',
];

const CIDADES_NORMALIZADAS = new Map(
    CIDADES_AMAUC.map((cidade) => [normalizarCidade(cidade), cidade])
);

function normalizarCidade(nome) {
    return nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function cidadePermitida(nomeCidade) {
    if (!nomeCidade || typeof nomeCidade !== 'string') {
        return null;
    }
    return CIDADES_NORMALIZADAS.get(normalizarCidade(nomeCidade)) || null;
}

module.exports = {
    CIDADES_AMAUC,
    cidadePermitida,
    normalizarCidade,
};
