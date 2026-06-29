const ChatModel = require('../models/ChatModel');
const { notificarUsuarioSemBloquear } = require('../services/notificationService');

function usuarioId(req) {
    return req.usuarioLogado?.id;
}

const ChatController = {
    listarConversas: async (req, res) => {
        try {
            const userId = usuarioId(req);
            if (!userId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            const conversas = await ChatModel.listarConversas(userId);
            return res.status(200).json({
                conversas,
                total: conversas.length,
            });
        } catch (erro) {
            console.error('Erro ao listar conversas:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar conversas.' });
        }
    },

    listarMensagens: async (req, res) => {
        try {
            const servicoId = Number(req.params.id);
            const userId = usuarioId(req);
            const beforeId = req.query.before_id ? Number(req.query.before_id) : null;
            const limit = req.query.limit ? Number(req.query.limit) : 80;

            if (!servicoId) {
                return res.status(400).json({ erro: 'ID do servico invalido.' });
            }

            const mensagens = await ChatModel.listarMensagens(servicoId, userId, {
                limit,
                beforeId,
            });

            if (!mensagens) {
                return res.status(404).json({
                    erro: 'Chamado nao encontrado ou usuario sem acesso ao chat.',
                });
            }

            return res.status(200).json({ mensagens });
        } catch (erro) {
            console.error('Erro ao listar mensagens do chat:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar mensagens.' });
        }
    },

    enviarMensagem: async (req, res) => {
        try {
            const servicoId = Number(req.params.id);
            const userId = usuarioId(req);
            const texto = String(req.body.mensagem || '').trim();

            if (!servicoId) {
                return res.status(400).json({ erro: 'ID do servico invalido.' });
            }

            if (!texto || texto.length > 1000) {
                return res.status(400).json({
                    erro: 'Mensagem deve ter entre 1 e 1000 caracteres.',
                });
            }

            const mensagem = await ChatModel.criarMensagem(servicoId, userId, texto);
            if (!mensagem) {
                return res.status(404).json({
                    erro: 'Chamado nao encontrado ou usuario sem acesso ao chat.',
                });
            }

            const destinatarioId = await ChatModel.buscarDestinatarioMensagem(servicoId, userId);
            notificarUsuarioSemBloquear({
                usuarioId: destinatarioId,
                tipo: 'nova_mensagem_chat',
                titulo: 'Nova mensagem no chat',
                corpo: mensagem.mensagem,
                payload: {
                    servico_id: servicoId,
                    mensagem_id: mensagem.id,
                },
            });

            return res.status(201).json({ mensagem });
        } catch (erro) {
            console.error('Erro ao enviar mensagem do chat:', erro);
            return res.status(500).json({ erro: 'Erro interno ao enviar mensagem.' });
        }
    },
};

module.exports = ChatController;
