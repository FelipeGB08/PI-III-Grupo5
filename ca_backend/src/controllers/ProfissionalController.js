const ProfissionalModel = require('../models/ProfissionalModel');

const ProfissionalController = {
    listar: async (req, res) => {
        try {
            const latCidadao = req.query.lat;
            const lngCidadao = req.query.lng;
            const categoriaId = req.query.categoria; // Captura o ofício

            if (!latCidadao || !lngCidadao) {
                return res.status(400).json({ erro: 'As coordenadas de GPS (lat e lng) são obrigatórias.' });
            }

            const profissionais = await ProfissionalModel.buscarPorProximidade(latCidadao, lngCidadao, categoriaId);
            return res.status(200).json(profissionais);

        } catch (erro) {
            console.error('Erro na geolocalização:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar profissionais.' });
        }
    }
};

module.exports = ProfissionalController;