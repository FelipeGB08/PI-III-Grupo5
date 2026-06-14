const SolicitacaoModel = require('../models/SolicitacaoModel');

const SolicitacaoController = {
    criarSolicitacao: async (req, res) => {
        try {
            const cidadao_id = req.usuarioLogado.id;
            const { profissional_id, descricao } = req.body;

            if (!profissional_id || !descricao || descricao.trim() === '') {
                return res.status(400).json({ erro: 'Dados incompletos para solicitação.' });
            }

            if (cidadao_id === profissional_id) {
                return res.status(400).json({ erro: 'Você não pode solicitar serviços para si mesmo.' });
            }

            const novaSolicitacao = await SolicitacaoModel.criar(cidadao_id, profissional_id, descricao);
            
            return res.status(201).json({ 
                mensagem: 'Orçamento solicitado com sucesso!', 
                solicitacao: novaSolicitacao 
            });
        } catch (erro) {
            console.error('Erro ao criar solicitação:', erro);
            return res.status(500).json({ erro: 'Falha interna ao processar agendamento.' });
        }
    },

    listarMeusPedidos: async (req, res) => {
        try {
            const profissional_id = req.usuarioLogado.id;
            const { status } = req.query; // Agora aceita ?status=pendente

            const pedidos = await SolicitacaoModel.buscarPorProfissional(profissional_id, status);
            return res.status(200).json(pedidos);
        } catch (erro) {
            console.error('Erro ao listar pedidos:', erro);
            return res.status(500).json({ erro: 'Erro ao recuperar pedidos.' });
        }
    },

    listarMinhasSolicitacoes: async (req, res) => {
        try {
            const cidadao_id = req.usuarioLogado.id;
            const pedidos = await SolicitacaoModel.buscarPorCidadao(cidadao_id);
            return res.status(200).json(pedidos);
        } catch (erro) {
            console.error('Erro ao listar solicitações do cidadão:', erro);
            return res.status(500).json({ erro: 'Erro ao recuperar solicitações.' });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const profissional_id = req.usuarioLogado.id;
            const { id } = req.params;
            const { status, preco } = req.body;

            // Chama o Model que já faz a validação e o update de forma segura
            const solicitacaoAtualizada = await SolicitacaoModel.atualizarStatus(id, profissional_id, status, preco);

            if (!solicitacaoAtualizada) {
                return res.status(404).json({ erro: 'Solicitação não encontrada ou acesso negado.' });
            }

            return res.status(200).json({ 
                mensagem: 'Solicitação atualizada com sucesso!', 
                solicitacao: solicitacaoAtualizada 
            });
        } catch (erro) {
            console.error('Erro na atualização:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor ao processar atualização.' });
        }
    }
};

module.exports = SolicitacaoController;