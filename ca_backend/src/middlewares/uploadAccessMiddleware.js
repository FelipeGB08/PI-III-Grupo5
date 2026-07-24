const path = require('path');
const { prefixoUrlUploads } = require('../config/uploads');
const { validarAccessTokenAtivo } = require('../services/authTokenService');

function tokenBearer(req) {
    const authorization = String(req.headers?.authorization || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}

function urlDoUpload(req) {
    const pathname = String(req.path || '');
    const nome = path.posix.basename(pathname);
    if (
        pathname !== `/${nome}` ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]*[.](?:jpg|png|webp)$/i.test(nome)
    ) {
        return null;
    }
    return `${prefixoUrlUploads}/${nome}`;
}

function criarProtecaoDeUpload(
    pool,
    { validarToken = validarAccessTokenAtivo } = {}
) {
    return async (req, res, next) => {
        const url = urlDoUpload(req);
        if (!url) return next();

        try {
            const resultado = await pool.query(
                `SELECT cidadao_id, prof_id
                 FROM servicos_solicitados
                 WHERE foto_url = $1
                    OR fotos_conclusao @> ARRAY[$1]::text[]
                 LIMIT 1`,
                [url]
            );
            const solicitacao = resultado.rows[0];

            // Fotos de perfil/portfolio permanecem publicas. Somente anexos que
            // pertencem a um chamado exigem autorizacao.
            if (!solicitacao) return next();

            const token = tokenBearer(req);
            if (!token) {
                return res.status(401).json({
                    erro: 'Token de autenticacao obrigatorio para acessar este anexo.',
                });
            }

            const { usuario } = await validarToken(token);
            const usuarioId = Number(usuario.id);
            const participaDaSolicitacao =
                usuarioId === Number(solicitacao.cidadao_id) ||
                usuarioId === Number(solicitacao.prof_id);
            if (!participaDaSolicitacao && usuario.perfil_tipo !== 'admin') {
                return res.status(403).json({
                    erro: 'Usuario sem acesso a este anexo.',
                });
            }

            res.locals = res.locals || {};
            res.locals.uploadPrivado = true;
            res.set('Cache-Control', 'private, no-store');
            return next();
        } catch (erro) {
            if (erro.codigo || erro.status === 401) {
                return res.status(401).json({
                    erro: 'Sessao invalida ou encerrada.',
                });
            }
            return next(erro);
        }
    };
}

module.exports = {
    criarProtecaoDeUpload,
    tokenBearer,
    urlDoUpload,
};
