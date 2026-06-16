const ProfissionalModel = require('../models/ProfissionalModel');

const ProfissionalController = {
    listar: async (req, res) => {
        try {
            const cidade = req.query.cidade || null;
            const categoria = req.query.categoria || null;

            const profissionais = await ProfissionalModel.buscarPorFiltros(cidade, categoria);
            return res.status(200).json(profissionais);
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
