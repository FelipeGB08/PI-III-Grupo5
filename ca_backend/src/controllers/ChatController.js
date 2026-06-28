const ChatModel = require('../models/ChatModel');

function usuarioId(req) {
    return req.usuarioLogado?.id;
}

const ChatController = {
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

            return res.status(201).json({ mensagem });
        } catch (erro) {
            console.error('Erro ao enviar mensagem do chat:', erro);
            return res.status(500).json({ erro: 'Erro interno ao enviar mensagem.' });
        }
    },
};

module.exports = ChatController;
