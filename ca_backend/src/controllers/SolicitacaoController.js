const SolicitacaoModel = require('../models/SolicitacaoModel');

const SolicitacaoController = {
    criarSolicitacao: async (req, res) => {
        try {
            // O ID do cidadão vem seguro, direto do token da catraca
            const cidadao_id = req.usuarioLogado.id; 
            const { profissional_id, descricao } = req.body;

            if (!profissional_id || !descricao) {
                return res.status(400).json({ erro: 'Profissional e descrição são obrigatórios.' });
            }

            const novaSolicitacao = await SolicitacaoModel.criar(cidadao_id, profissional_id, descricao);
            
            return res.status(201).json({ 
                mensagem: 'Orçamento solicitado com sucesso!', 
                solicitacao: novaSolicitacao 
            });
        } catch (erro) {
            console.error('Erro ao criar solicitação:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarMeusPedidos: async (req, res) => {
        try {
            const profissional_id = req.usuarioLogado.id;
            const pedidos = await SolicitacaoModel.buscarPorProfissional(profissional_id);
            return res.status(200).json(pedidos);
        } catch (erro) {
            console.error('Erro ao buscar pedidos:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const profissional_id = req.usuarioLogado.id;
            const { id } = req.params; // ID do pedido que vem na URL
            const { status } = req.body;

            const atualizado = await SolicitacaoModel.atualizarStatus(id, profissional_id, status);
            
            if (!atualizado) {
                return res.status(404).json({ erro: 'Pedido não encontrado ou você não tem permissão.' });
            }

            return res.status(200).json({ 
                mensagem: 'Status atualizado com sucesso!', 
                solicitacao: atualizado 
            });
        } catch (erro) {
            console.error('Erro ao atualizar status:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = SolicitacaoController;