const NotificationModel = require('../models/NotificationModel');

const NotificationController = {
    listar: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);
            const somenteNaoLidas =
                String(req.query.nao_lidas || '').toLowerCase() === 'true';

            const resultado = await NotificationModel.listarNotificacoes({
                usuarioId,
                page,
                limit,
                somenteNaoLidas,
            });

            return res.status(200).json(resultado);
        } catch (erro) {
            console.error('Erro ao listar notificacoes:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar notificacoes.' });
        }
    },

    marcarLida: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const id = Number(req.params.id);

            if (!id) {
                return res.status(400).json({ erro: 'ID da notificacao invalido.' });
            }

            const notificacao = await NotificationModel.marcarLida({ usuarioId, id });
            if (!notificacao) {
                return res.status(404).json({ erro: 'Notificacao nao encontrada.' });
            }

            return res.status(200).json({ notificacao });
        } catch (erro) {
            console.error('Erro ao marcar notificacao como lida:', erro);
            return res.status(500).json({ erro: 'Erro interno ao atualizar notificacao.' });
        }
    },

    marcarTodasLidas: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const atualizadas = await NotificationModel.marcarTodasLidas(usuarioId);
            return res.status(200).json({
                mensagem: 'Notificacoes marcadas como lidas.',
                atualizadas,
            });
        } catch (erro) {
            console.error('Erro ao marcar notificacoes como lidas:', erro);
            return res.status(500).json({ erro: 'Erro interno ao atualizar notificacoes.' });
        }
    },
};

module.exports = NotificationController;
