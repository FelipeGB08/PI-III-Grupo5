const DenunciaModel = require('../models/DenunciaModel');
const UserModel = require('../models/UserModel');
const { enviarAlertaDenunciaAdmin } = require('../services/emailService');
const { notificarUsuarioSemBloquear } = require('../services/notificationService');
const logger = require('../utils/logger');

function obterIdUsuarioLogado(req) {
    return req.usuarioLogado?.id || req.usuario?.id || req.user?.id;
}

function notificarAdminsSobreNovaDenuncia(denuncia) {
    UserModel.listarAdministradoresAtivos()
        .then((administradores) => Promise.allSettled(
            administradores.map((administrador) => enviarAlertaDenunciaAdmin({
                to: administrador.email,
                denunciaId: denuncia.id,
                servicoId: denuncia.servico_solicitado_id,
                motivo: denuncia.motivo,
            }))
        ))
        .then((resultados) => {
            const falhas = resultados.filter((resultado) => resultado.status === 'rejected');
            if (falhas.length) {
                logger.warn('Alguns administradores nao receberam o alerta de denuncia.', {
                    componente: 'denuncias',
                    denunciaId: denuncia.id,
                    falhas: falhas.length,
                });
            }
        })
        .catch((erro) => {
            logger.error('Falha ao notificar administradores sobre nova denuncia.', {
                erro,
                componente: 'denuncias',
                denunciaId: denuncia.id,
            });
        });
}

const DenunciaController = {
    criar: async (req, res) => {
        try {
            const denuncianteId = obterIdUsuarioLogado(req);
            const servicoSolicitadoId = Number(req.params.id);
            const dados = req.validated?.body || req.body;

            if (!denuncianteId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }
            if (!servicoSolicitadoId) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const denuncia = await DenunciaModel.criar({
                servicoSolicitadoId,
                denuncianteId,
                motivo: dados.motivo,
                descricao: dados.descricao,
            });

            // A mesma resposta para chamado inexistente e chamado de terceiros evita enumeracao.
            if (!denuncia) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou voce nao participa deste chamado.',
                });
            }

            notificarAdminsSobreNovaDenuncia(denuncia);

            return res.status(201).json({
                mensagem: 'Denuncia registrada e enviada para analise administrativa.',
                denuncia,
            });
        } catch (erro) {
            logger.error('Erro ao registrar denuncia.', {
                erro,
                componente: 'denuncias',
                usuarioId: obterIdUsuarioLogado(req),
            });
            return res.status(500).json({ erro: 'Nao foi possivel registrar a denuncia.' });
        }
    },

    listarParaAdmin: async (req, res) => {
        try {
            const status = req.validated?.query?.status || req.query?.status || null;
            const denuncias = await DenunciaModel.listarParaAdmin(status);
            return res.status(200).json({ denuncias });
        } catch (erro) {
            logger.error('Erro ao listar denuncias administrativas.', {
                erro,
                componente: 'denuncias',
            });
            return res.status(500).json({ erro: 'Nao foi possivel listar as denuncias.' });
        }
    },

    buscarDetalheParaAdmin: async (req, res) => {
        try {
            const denuncia = await DenunciaModel.buscarDetalheParaAdmin(Number(req.params.id));
            if (!denuncia) {
                return res.status(404).json({ erro: 'Denuncia nao encontrada.' });
            }
            return res.status(200).json({ denuncia });
        } catch (erro) {
            logger.error('Erro ao consultar denuncia administrativa.', {
                erro,
                componente: 'denuncias',
            });
            return res.status(500).json({ erro: 'Nao foi possivel consultar a denuncia.' });
        }
    },

    atualizarPorAdmin: async (req, res) => {
        try {
            const denuncia = await DenunciaModel.atualizarPorAdmin({
                denunciaId: Number(req.params.id),
                adminId: obterIdUsuarioLogado(req),
                status: req.body.status,
                resolucaoAdmin: req.body.resolucao_admin,
            });
            if (!denuncia) {
                return res.status(404).json({ erro: 'Denuncia nao encontrada.' });
            }

            if (
                denuncia.status === 'resolvida' &&
                denuncia.status_anterior !== 'resolvida'
            ) {
                notificarUsuarioSemBloquear({
                    usuarioId: denuncia.denunciante_id,
                    tipo: 'denuncia_resolvida',
                    titulo: 'Denuncia resolvida',
                    corpo: 'A administracao registrou uma resolucao para a sua denuncia.',
                    payload: {
                        denuncia_id: denuncia.id,
                        solicitacao_id: denuncia.servico_solicitado_id,
                        status: denuncia.status,
                        destino: 'agendamento',
                    },
                });
            }

            return res.status(200).json({
                mensagem: 'Denuncia atualizada com sucesso.',
                denuncia,
            });
        } catch (erro) {
            logger.error('Erro ao atualizar denuncia administrativa.', {
                erro,
                componente: 'denuncias',
                usuarioId: obterIdUsuarioLogado(req),
            });
            return res.status(500).json({ erro: 'Nao foi possivel atualizar a denuncia.' });
        }
    },
};

module.exports = DenunciaController;
