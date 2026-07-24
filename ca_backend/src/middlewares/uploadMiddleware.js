const multer = require('multer');
const {
    arquivosDaRequisicao,
    persistirImagensDaRequisicao,
    removerArquivosDeUpload,
} = require('../services/imageUploadService');

async function validarEArmazenarImagens(req, res, next) {
    try {
        await persistirImagensDaRequisicao(req, req.uploadImageOptions);
        return next();
    } catch (erro) {
        return res.status(erro.status || 500).json({
            erro: erro.status
                ? erro.message
                : 'Nao foi possivel salvar a imagem enviada.',
        });
    }
}

function configurarArmazenamentoDeImagem(options) {
    return (req, res, next) => {
        req.uploadImageOptions = options;
        next();
    };
}

function comLimpezaDeUpload(controller) {
    return async (req, res, next) => {
        try {
            await controller(req, res, next);
            if (res.statusCode >= 400) {
                await removerArquivosDeUpload(arquivosDaRequisicao(req));
            }
        } catch (erro) {
            try {
                await removerArquivosDeUpload(arquivosDaRequisicao(req));
            } catch (erroLimpeza) {
                return next(erroLimpeza);
            }
            return next(erro);
        }
    };
}

function tratarErroDeUpload(erro, req, res, next) {
    if (!erro) return next();

    if (erro instanceof multer.MulterError) {
        const mensagem = erro.code === 'LIMIT_FILE_SIZE'
            ? 'Imagem muito grande. Envie arquivos de ate 5MB.'
            : erro.code === 'LIMIT_FILE_COUNT'
                ? 'Envie no maximo 5 imagens por requisicao.'
                : 'Arquivo de upload invalido.';
        return res.status(400).json({ erro: mensagem });
    }

    return next(erro);
}

module.exports = {
    comLimpezaDeUpload,
    configurarArmazenamentoDeImagem,
    tratarErroDeUpload,
    validarEArmazenarImagens,
};
