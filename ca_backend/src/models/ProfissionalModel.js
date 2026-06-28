const pool = require('../config/db');
const {
    coordenadasCidade,
    distanciaKm,
} = require('../config/amaucCidades');

const CAMPOS_PROFISSIONAL = `
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.foto_url,
    u.cidade_amauc,
    pp.biografia,
    pp.curriculo_texto,
    pp.portfolio_url,
    pp.portfolio_fotos,
    pp.certificacoes,
    pp.anos_experiencia,
    pp.verificado,
    pp.atende_rural,
    pp.atende_emergencia,
    pp.possui_veiculo,
    pp.cidades_atendidas,
    pp.taxa_deslocamento,
    COALESCE(ROUND(AVG(a.nota_estrelas), 1), 0) AS media_avaliacao,
    COUNT(DISTINCT CASE WHEN s.status = 'concluido' THEN s.id END) AS total_servicos,
    COUNT(DISTINCT CASE WHEN a.nota_estrelas >= 4 THEN a.id END) AS avaliacoes_positivas,
    COALESCE(
        json_agg(DISTINCT c.nome_servico) FILTER (WHERE c.nome_servico IS NOT NULL),
        '[]'
    ) AS categorias
`;

const ProfissionalModel = {
    buscarPorFiltros: async (
        cidade,
        categoria,
        atendeRural = null,
        {
            limit = 20,
            offset = 0,
            lat = null,
            lng = null,
            raioKm = null,
        } = {}
    ) => {
        let fromWhere = `
            FROM usuarios u
            INNER JOIN perfis_profissionais pp ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            LEFT JOIN servicos_solicitados s ON s.prof_id = u.id
            LEFT JOIN avaliacoes a ON a.servico_id = s.id
            WHERE u.perfil_tipo = 'profissional'
        `;
        const valores = [];
        let indice = 1;

        if (cidade) {
            fromWhere += ` AND (u.cidade_amauc = $${indice} OR $${indice} = ANY(pp.cidades_atendidas))`;
            valores.push(cidade);
            indice++;
        }

        if (categoria) {
            const categoriaNumerica = Number(categoria);
            if (!Number.isNaN(categoriaNumerica)) {
                fromWhere += ` AND pc.categoria_id = $${indice}`;
                valores.push(categoriaNumerica);
            } else {
                fromWhere += ` AND c.nome_servico ILIKE $${indice}`;
                valores.push(categoria);
            }
            indice++;
        }

        if (atendeRural === 'true') {
            fromWhere += ' AND pp.atende_rural = TRUE';
        }

        const query = `
            SELECT ${CAMPOS_PROFISSIONAL}
            ${fromWhere}
            GROUP BY u.id, pp.id
            ORDER BY pp.verificado DESC, pp.atende_rural DESC, u.nome ASC;
        `;

        const resultado = await pool.query(query, valores);
        const origem = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
        const raio = raioKm ? Number(raioKm) : null;
        const enriquecidos = resultado.rows
            .map((row) => {
                const coords = coordenadasCidade(row.cidade_amauc);
                const distancia = distanciaKm(origem, coords);
                return {
                    ...row,
                    latitude: coords?.lat ?? null,
                    longitude: coords?.lng ?? null,
                    distancia_km: distancia,
                };
            })
            .filter((row) => !origem || !raio || (
                row.distancia_km !== null && row.distancia_km <= raio
            ))
            .sort((a, b) => {
                if (!origem) return 0;
                return (a.distancia_km ?? Number.MAX_SAFE_INTEGER) -
                    (b.distancia_km ?? Number.MAX_SAFE_INTEGER);
            });

        const paginados = enriquecidos.slice(offset, offset + limit);
        return {
            rows: paginados,
            total: enriquecidos.length,
        };
    },

    buscarPorId: async (id) => {
        const query = `
            SELECT ${CAMPOS_PROFISSIONAL}
            FROM usuarios u
            INNER JOIN perfis_profissionais pp ON pp.usuario_id = u.id
            LEFT JOIN profissional_categorias pc ON pc.profissional_id = u.id
            LEFT JOIN categorias c ON c.id = pc.categoria_id
            LEFT JOIN servicos_solicitados s ON s.prof_id = u.id
            LEFT JOIN avaliacoes a ON a.servico_id = s.id
            WHERE u.id = $1 AND u.perfil_tipo = 'profissional'
            GROUP BY u.id, pp.id;
        `;
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    },
};

module.exports = ProfissionalModel;
