const NotificationModel = require('../models/NotificationModel');
const NotificationPreferenceModel = require('../models/NotificationPreferenceModel');

function usuarioEhCidadao(usuario) {
    const perfil = usuario?.perfil_tipo || usuario?.tipo_usuario;
    return perfil === 'cidadao';
}

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

    buscarPreferencias: async (req, res) => {
        try {
            if (!usuarioEhCidadao(req.usuarioLogado)) {
                return res.status(403).json({
                    erro: 'Esta preferencia esta disponivel somente para clientes.',
                });
            }

            const preferencias = await NotificationPreferenceModel.buscarPreferencias(
                req.usuarioLogado.id
            );
            if (!preferencias) {
                return res.status(404).json({ erro: 'Usuario nao encontrado.' });
            }

            return res.status(200).json({ preferencias });
        } catch (erro) {
            console.error('Erro ao buscar preferencias de notificacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar preferencias.' });
        }
    },

    atualizarPreferencias: async (req, res) => {
        try {
            if (!usuarioEhCidadao(req.usuarioLogado)) {
                return res.status(403).json({
                    erro: 'Esta preferencia esta disponivel somente para clientes.',
                });
            }

            const preferencias = await NotificationPreferenceModel.atualizarNovosHorariosFavoritos({
                usuarioId: req.usuarioLogado.id,
                ativado: req.body.novos_horarios_favoritos,
            });

            return res.status(200).json({
                mensagem: 'Preferencias de notificacao atualizadas.',
                preferencias,
            });
        } catch (erro) {
            console.error('Erro ao atualizar preferencias de notificacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao atualizar preferencias.' });
        }
    },
};

module.exports = NotificationController;
