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

const COORDENADAS_AMAUC = {
    arabuta: { lat: -27.1583, lng: -52.1428 },
    arvoredo: { lat: -27.0747, lng: -52.4542 },
    concordia: { lat: -27.2342, lng: -52.0277 },
    ipira: { lat: -27.4039, lng: -51.7758 },
    ipumirim: { lat: -27.0778, lng: -52.1356 },
    irani: { lat: -27.0242, lng: -51.9017 },
    ita: { lat: -27.2906, lng: -52.3219 },
    'lindoia do sul': { lat: -27.0542, lng: -52.0692 },
    paial: { lat: -27.2542, lng: -52.4972 },
    peritiba: { lat: -27.3753, lng: -51.9017 },
    piratuba: { lat: -27.4192, lng: -51.7719 },
    'presidente castello branco': { lat: -27.2247, lng: -51.8078 },
    seara: { lat: -27.1564, lng: -52.2992 },
    xavantina: { lat: -27.0661, lng: -52.3433 },
};

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

function coordenadasCidade(nomeCidade) {
    if (!nomeCidade || typeof nomeCidade !== 'string') return null;
    return COORDENADAS_AMAUC[normalizarCidade(nomeCidade)] || null;
}

function distanciaKm(origem, destino) {
    if (!origem || !destino) return null;

    const toRad = (valor) => (Number(valor) * Math.PI) / 180;
    const raioTerraKm = 6371;
    const dLat = toRad(destino.lat - origem.lat);
    const dLng = toRad(destino.lng - origem.lng);
    const lat1 = toRad(origem.lat);
    const lat2 = toRad(destino.lat);

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((raioTerraKm * c).toFixed(1));
}

module.exports = {
    CIDADES_AMAUC,
    cidadePermitida,
    normalizarCidade,
    coordenadasCidade,
    distanciaKm,
};
