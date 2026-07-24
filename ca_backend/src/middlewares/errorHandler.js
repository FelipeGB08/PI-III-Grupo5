const logger = require('../utils/logger');

function erroDeJsonMalformado(erro) {
    return erro instanceof SyntaxError && (
        erro.type === 'entity.parse.failed' ||
        (erro.status === 400 && Object.prototype.hasOwnProperty.call(erro, 'body'))
    );
}

function errorHandler(err, req, res, next) {
    if (erroDeJsonMalformado(err)) {
        return res.status(400).json({
            erro: 'JSON malformado. Verifique a sintaxe do corpo da requisicao.',
        });
    }

    if (
        err.name === 'MulterError' ||
        err.message?.includes('Tipo de arquivo nao permitido')
    ) {
        return res.status(400).json({
            erro: err.code === 'LIMIT_FILE_SIZE'
                ? 'Imagem muito grande. Envie arquivos de ate 5MB.'
                : err.message,
        });
    }

    logger.error('Erro nao tratado pela API.', {
        erro: err,
        metodo: req.method,
        rota: req.path,
        usuarioId: req.usuarioLogado?.id,
    });
    return res.status(500).json({
        erro: 'Ocorreu um erro interno inesperado no servidor.',
        detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
}

module.exports = errorHandler;
