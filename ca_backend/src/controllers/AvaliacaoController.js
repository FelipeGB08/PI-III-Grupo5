const AvaliacaoModel = require('../models/AvaliacaoModel');

const AvaliacaoController = {
    criarAvaliacao: async (req, res) => {
        try {
            const cidadao_id = req.usuarioLogado.id;
            const { solicitacao_id, profissional_id, nota, comentario } = req.body;

            if (!solicitacao_id || !profissional_id || !nota) {
                return res.status(400).json({ erro: 'Solicitação, profissional e nota são obrigatórios.' });
            }

            // A nota tem que ser entre 1 e 5 estrelas
            if (nota < 1 || nota > 5) {
                return res.status(400).json({ erro: 'A nota deve ser entre 1 e 5.' });
            }

            const novaAvaliacao = await AvaliacaoModel.criar(solicitacao_id, cidadao_id, profissional_id, nota, comentario);
            return res.status(201).json({ mensagem: 'Avaliação registrada!', avaliacao: novaAvaliacao });
        } catch (erro) {
            console.error('Erro ao criar avaliação:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarDoProfissional: async (req, res) => {
        try {
            const { id } = req.params; // Pega o ID da URL
            const avaliacoes = await AvaliacaoModel.buscarPorProfissional(id);
            const mediaResult = await AvaliacaoModel.calcularMedia(id);
            
            // Se não tiver média (ninguém avaliou), fica 0
            const media = mediaResult ? parseFloat(mediaResult) : 0; 
            
            return res.status(200).json({ media: media, avaliacoes: avaliacoes });
        } catch (erro) {
            console.error('Erro ao buscar avaliações:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = AvaliacaoController;