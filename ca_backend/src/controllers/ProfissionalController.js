const ProfissionalModel = require('../models/ProfissionalModel');
const {
    parsePagination,
    setPaginationHeaders,
} = require('../utils/pagination');

const ProfissionalController = {
    listar: async (req, res) => {
        try {
            const cidade = req.query.cidade || null;
            const categoria = req.query.categoria || null;
            const atendeRural = req.query.atende_rural || null;
            const pagination = {
                ...parsePagination(req.query),
                lat: req.query.lat || null,
                lng: req.query.lng || null,
                raioKm: req.query.raio_km || req.query.raioKm || null,
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
            return res.status(200).json(resultado.rows);
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

            return res.status(200).json(profissional);
        } catch (erro) {
            console.error('Erro ao buscar profissional:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar profissional.' });
        }
    },
};

module.exports = ProfissionalController;
