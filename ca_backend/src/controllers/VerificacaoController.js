const fs = require('fs/promises');
const path = require('path');
const PerfilModel = require('../models/PerfilModel');
const { notificarUsuarioSemBloquear } = require('../services/notificationService');
const {
    nomeDocumentoVerificacao,
    pastaDocumentosVerificacao,
} = require('../config/uploads');
const logger = require('../utils/logger');

function idUsuario(req) {
    return req.usuarioLogado?.id || req.usuario?.id || req.user?.id;
}

function respostaVerificacao(verificacao) {
    if (!verificacao) return null;

    return {
        perfil_id: verificacao.perfil_id,
        status_verificacao: verificacao.status_verificacao,
        enviado_em: verificacao.enviado_em,
        revisado_em: verificacao.revisado_em,
        motivo_rejeicao: verificacao.motivo_rejeicao || null,
        documento_disponivel: Boolean(verificacao.documento_url),
    };
}

async function removerDocumentoAntigo(referencia) {
    const nomeArquivo = nomeDocumentoVerificacao(referencia);
    if (!nomeArquivo) return;

    try {
        await fs.unlink(path.join(pastaDocumentosVerificacao, nomeArquivo));
    } catch (erro) {
        if (erro.code !== 'ENOENT') {
            logger.warn('Nao foi possivel remover documento antigo de verificacao.', {
                erro,
                componente: 'verificacao',
            });
        }
    }
}

function servirDocumento(res, referencia, next) {
    const nomeArquivo = nomeDocumentoVerificacao(referencia);
    if (!nomeArquivo) {
        return res.status(404).json({ erro: 'Documento de verificacao nao encontrado.' });
    }

    res.set('Cache-Control', 'private, no-store');
    return res.sendFile(nomeArquivo, { root: pastaDocumentosVerificacao }, (erro) => {
        if (!erro) return;
        if (erro.code === 'ENOENT' || erro.status === 404) {
            if (!res.headersSent) {
                res.status(404).json({ erro: 'Documento de verificacao nao encontrado.' });
            }
            return;
        }
        next(erro);
    });
}

const VerificacaoController = {
    enviarDocumento: async (req, res) => {
        try {
            const usuarioId = idUsuario(req);
            if (!usuarioId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!req.file?.url) {
                return res.status(400).json({
                    erro: 'Envie uma imagem de documento para verificacao.',
                });
            }

            const verificacaoAnterior = await PerfilModel.buscarVerificacaoPorUsuarioId(
                usuarioId
            );
            if (!verificacaoAnterior) {
                return res.status(404).json({
                    erro: 'Perfil profissional nao encontrado.',
                });
            }

            const verificacao = await PerfilModel.enviarDocumentoVerificacao(
                usuarioId,
                req.file.url
            );
            await removerDocumentoAntigo(verificacaoAnterior.documento_url);

            return res.status(200).json({
                mensagem: 'Documento enviado para revisao administrativa.',
                verificacao: respostaVerificacao(verificacao),
            });
        } catch (erro) {
            logger.error('Erro ao enviar documento de verificacao.', {
                erro,
                componente: 'verificacao',
            });
            return res.status(500).json({
                erro: 'Nao foi possivel enviar o documento de verificacao.',
            });
        }
    },

    buscarMinhaVerificacao: async (req, res) => {
        try {
            const verificacao = await PerfilModel.buscarVerificacaoPorUsuarioId(idUsuario(req));
            if (!verificacao) {
                return res.status(404).json({ erro: 'Perfil profissional nao encontrado.' });
            }
            return res.status(200).json({ verificacao: respostaVerificacao(verificacao) });
        } catch (erro) {
            logger.error('Erro ao consultar verificacao profissional.', {
                erro,
                componente: 'verificacao',
            });
            return res.status(500).json({ erro: 'Erro interno ao consultar verificacao.' });
        }
    },

    baixarMeuDocumento: async (req, res, next) => {
        try {
            const verificacao = await PerfilModel.buscarVerificacaoPorUsuarioId(idUsuario(req));
            if (!verificacao?.documento_url) {
                return res.status(404).json({ erro: 'Documento de verificacao nao encontrado.' });
            }
            return servirDocumento(res, verificacao.documento_url, next);
        } catch (erro) {
            return next(erro);
        }
    },

    listarPendentes: async (req, res) => {
        try {
            const verificacoes = await PerfilModel.listarVerificacoesPendentes();
            return res.status(200).json({ verificacoes });
        } catch (erro) {
            logger.error('Erro ao listar verificacoes pendentes.', {
                erro,
                componente: 'verificacao',
            });
            return res.status(500).json({ erro: 'Erro interno ao listar verificacoes.' });
        }
    },

    baixarDocumentoAdmin: async (req, res, next) => {
        try {
            const verificacao = await PerfilModel.buscarVerificacaoPorPerfilId(
                Number(req.params.id)
            );
            if (!verificacao?.documento_url) {
                return res.status(404).json({ erro: 'Documento de verificacao nao encontrado.' });
            }
            return servirDocumento(res, verificacao.documento_url, next);
        } catch (erro) {
            return next(erro);
        }
    },

    aprovar: async (req, res) => {
        try {
            const verificacao = await PerfilModel.aprovarVerificacao(
                Number(req.params.id),
                idUsuario(req)
            );
            if (!verificacao) {
                return res.status(404).json({
                    erro: 'Verificacao pendente nao encontrada.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: verificacao.usuario_id,
                tipo: 'verificacao_aprovada',
                titulo: 'Perfil verificado',
                corpo: 'Seu documento foi aprovado. O selo de profissional verificado ja esta visivel.',
                payload: {
                    destino: 'verificacao',
                    status_verificacao: verificacao.status_verificacao,
                },
            });

            return res.status(200).json({
                mensagem: 'Verificacao aprovada com sucesso.',
                verificacao: respostaVerificacao(verificacao),
            });
        } catch (erro) {
            logger.error('Erro ao aprovar verificacao profissional.', {
                erro,
                componente: 'verificacao',
            });
            return res.status(500).json({ erro: 'Erro interno ao aprovar verificacao.' });
        }
    },

    rejeitar: async (req, res) => {
        try {
            const verificacao = await PerfilModel.rejeitarVerificacao(
                Number(req.params.id),
                idUsuario(req),
                req.body.motivo_rejeicao
            );
            if (!verificacao) {
                return res.status(404).json({
                    erro: 'Verificacao pendente nao encontrada.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: verificacao.usuario_id,
                tipo: 'verificacao_rejeitada',
                titulo: 'Documento precisa de revisao',
                corpo: 'A verificacao do seu perfil foi rejeitada. Consulte o motivo e envie um novo documento.',
                payload: {
                    destino: 'verificacao',
                    status_verificacao: verificacao.status_verificacao,
                },
            });

            return res.status(200).json({
                mensagem: 'Verificacao rejeitada.',
                verificacao: respostaVerificacao(verificacao),
            });
        } catch (erro) {
            logger.error('Erro ao rejeitar verificacao profissional.', {
                erro,
                componente: 'verificacao',
            });
            return res.status(500).json({ erro: 'Erro interno ao rejeitar verificacao.' });
        }
    },
};

module.exports = VerificacaoController;
