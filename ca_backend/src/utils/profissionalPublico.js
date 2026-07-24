const CAMPOS_PUBLICOS = [
    'id',
    'nome',
    'foto_url',
    'cidade_amauc',
    'biografia',
    'categorias',
    'verificado',
    'media_avaliacao',
    'distancia_km',
    'latitude',
    'longitude',
    'localizacao_aproximada',
];

function montarProfissionalPublico(profissional = {}) {
    return CAMPOS_PUBLICOS.reduce((resultado, campo) => {
        if (profissional[campo] !== undefined) {
            resultado[campo] = profissional[campo];
        }
        return resultado;
    }, {});
}

module.exports = {
    CAMPOS_PUBLICOS,
    montarProfissionalPublico,
};
