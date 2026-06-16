const RelatorioModel = require('../models/RelatorioModel');

const RelatorioController = {
    gerarRelatorio: async (req, res) => {
        try {
            // Trava de segurança: apenas admin passa!
            const perfil = req.usuarioLogado.perfil_tipo || req.usuarioLogado.tipo_usuario;
            if (perfil !== 'admin') {
                return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem ver os relatórios.' });
            }

            const estatisticas = await RelatorioModel.obterEstatisticas();
            return res.status(200).json(estatisticas);
            
        } catch (erro) {
            console.error('Erro ao gerar relatórios:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = RelatorioController;