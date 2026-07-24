const UserModel = require('../models/UserModel');
const logger = require('../utils/logger');

function usuarioLogadoId(req) {
    return Number(req.usuarioLogado?.id || req.usuarioLogado?.usuario_id);
}

const AdminUsuarioController = {
    listar: async (req, res) => {
        try {
            const filtros = req.validated?.query || req.query || {};
            const resultado = await UserModel.listarParaAdmin({
                page: filtros.page,
                pageSize: filtros.pageSize,
                perfilTipo: filtros.perfil_tipo,
                busca: filtros.busca,
            });

            return res.status(200).json({
                usuarios: resultado.items,
                total: resultado.total,
                page: resultado.page,
                pageSize: resultado.pageSize,
                totalPages: resultado.totalPages,
                hasMore: resultado.hasMore,
            });
        } catch (erro) {
            logger.error('Erro ao listar usuarios no painel administrativo.', {
                erro,
                componente: 'admin_usuarios',
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const usuarioId = Number(req.params.id);
            const administradorId = usuarioLogadoId(req);
            const { ativo } = req.validated?.body || req.body || {};

            if (usuarioId === administradorId) {
                return res.status(400).json({
                    erro: 'Nao e permitido alterar o status da propria conta.',
                });
            }

            const usuario = await UserModel.atualizarStatusPorAdmin({
                usuarioId,
                ativo,
            });

            if (!usuario) {
                return res.status(404).json({
                    erro: 'Usuario nao encontrado ou indisponivel para reativacao.',
                });
            }

            return res.status(200).json({
                mensagem: ativo
                    ? 'Conta ativada com sucesso.'
                    : 'Conta inativada com sucesso.',
                usuario,
            });
        } catch (erro) {
            logger.error('Erro ao atualizar status de usuario no painel administrativo.', {
                erro,
                componente: 'admin_usuarios',
                usuarioId: usuarioLogadoId(req),
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = AdminUsuarioController;
