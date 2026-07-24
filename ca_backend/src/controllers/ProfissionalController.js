const ProfissionalModel = require('../models/ProfissionalModel');
const {
    parsePagination,
    setPaginationHeaders,
} = require('../utils/pagination');
const { montarProfissionalPublico } = require('../utils/profissionalPublico');

const ProfissionalController = {
    listar: async (req, res) => {
        try {
            const filtros = req.validated?.query || req.query || {};
            const cidade = filtros.cidade || null;
            const categoria = filtros.categoria || null;
            const atendeRural = filtros.atende_rural ?? null;
            const pagination = {
                ...parsePagination(filtros),
                lat: filtros.lat ?? null,
                lng: filtros.lng ?? null,
                raioKm: filtros.raio_km ?? filtros.raioKm ?? null,
                precoMin: filtros.preco_min ?? null,
                precoMax: filtros.preco_max ?? null,
                notaMinima: filtros.nota_minima ?? null,
                disponivelEm: filtros.disponivel_em ?? null,
            };

            const resultado = await ProfissionalModel.buscarPorFiltros(
                cidade,
                categoria,
                atendeRural,
                pagination
            );
            setPaginationHeaders(res, {
                total: resultado.total,
                page: pagination.page,
                limit: pagination.limit,
            });
            return res.status(200).json(
                resultado.rows.map(montarProfissionalPublico)
            );
        } catch (erro) {
            console.error('Erro ao buscar profissionais:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar profissionais.' });
        }
    },

    buscarPorId: async (req, res) => {
        try {
            const { id } = req.params;
            const profissional = await ProfissionalModel.buscarPorId(id);

            if (!profissional) {
                return res.status(404).json({ erro: 'Profissional não encontrado.' });
            }

            return res.status(200).json(montarProfissionalPublico(profissional));
        } catch (erro) {
            console.error('Erro ao buscar profissional:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar profissional.' });
        }
    },
};

module.exports = ProfissionalController;
