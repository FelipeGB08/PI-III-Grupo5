const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const UserModel = require('../models/UserModel');
const {
    desconectarSocketsDoUsuario,
} = require('../services/chatSocketRegistry');

const PASTA_UPLOADS = path.resolve(__dirname, '..', '..', 'uploads');

function caminhoUploadSeguro(url) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) return null;

    const caminho = path.resolve(PASTA_UPLOADS, path.basename(url));
    return caminho.startsWith(`${PASTA_UPLOADS}${path.sep}`) ? caminho : null;
}

async function removerArquivosAnexados(urls) {
    await Promise.all(
        urls.map(async (url) => {
            const caminho = caminhoUploadSeguro(url);
            if (!caminho) return;

            try {
                await fs.unlink(caminho);
            } catch (erro) {
                if (erro.code !== 'ENOENT') {
                    console.warn('Nao foi possivel remover upload de conta excluida:', erro.message);
                }
            }
        })
    );
}

const ContaController = {
    excluirConta: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado?.id;
            if (!usuarioId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            const emailAnonimo = `removido-${usuarioId}-${crypto.randomUUID()}@anon.local`;
            const resultado = await UserModel.anonimizarConta({
                usuarioId,
                emailAnonimo,
            });

            if (!resultado?.conta) {
                return res.status(404).json({ erro: 'Conta nao encontrada ou ja removida.' });
            }

            desconectarSocketsDoUsuario(
                usuarioId,
                'Conta removida e sessoes revogadas.'
            );
            await removerArquivosAnexados(resultado.arquivosParaRemover || []);

            return res.status(200).json({
                mensagem: 'Conta excluida e dados pessoais anonimizados com sucesso.',
                refresh_tokens_revogados: resultado.refreshTokensRevogados,
            });
        } catch (erro) {
            console.error('Erro ao excluir conta:', erro);
            return res.status(500).json({ erro: 'Erro interno ao excluir conta.' });
        }
    },
};

module.exports = ContaController;
