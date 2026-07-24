const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshTokenModel = require('../models/RefreshTokenModel');

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;

function montarPayloadJwt(usuario, sessaoId) {
    return {
        id: usuario.id,
        perfil_tipo: usuario.perfil_tipo,
        tipo_usuario: usuario.perfil_tipo,
        sid: String(sessaoId),
    };
}

function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function criarAccessToken(usuario, sessaoId) {
    if (!sessaoId) {
        throw new Error('Uma sessao valida e obrigatoria para emitir access token.');
    }

    return jwt.sign(
        montarPayloadJwt(usuario, sessaoId),
        process.env.JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
            jwtid: crypto.randomUUID(),
        }
    );
}

async function criarSessao(usuario) {
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const expiraEm = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    const sessao = await RefreshTokenModel.criar({
        usuarioId: usuario.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiraEm,
    });

    return {
        accessToken: criarAccessToken(usuario, sessao.id),
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
}

async function buscarUsuarioPorRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    return RefreshTokenModel.buscarValidoPorHash(hashRefreshToken(refreshToken));
}

async function revogarRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    return RefreshTokenModel.revogarPorHash(hashRefreshToken(refreshToken));
}

function criarErroDeSessao(codigo, mensagem) {
    const erro = new Error(mensagem);
    erro.codigo = codigo;
    return erro;
}

async function validarAccessTokenAtivo(accessToken) {
    if (!process.env.JWT_SECRET) {
        throw criarErroDeSessao('jwt_nao_configurado', 'JWT_SECRET nao configurado no servidor.');
    }

    let payload;
    try {
        payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (erro) {
        if (erro instanceof jwt.TokenExpiredError) {
            throw criarErroDeSessao('token_expirado', 'Token expirado. Faca login novamente.');
        }
        throw criarErroDeSessao('token_invalido', 'Token invalido.');
    }

    const sessaoId = String(payload.sid || '').trim();
    if (!/^\d+$/.test(sessaoId)) {
        throw criarErroDeSessao('sessao_invalida', 'Sessao invalida. Faca login novamente.');
    }

    // A referencia da sessao fica no PostgreSQL. Assim, a revogacao de um
    // refresh token ou a inativacao da conta invalida o JWT sem blacklist local.
    const usuario = await RefreshTokenModel.buscarUsuarioPorSessaoAtiva({
        sessaoId,
        usuarioId: payload.id,
    });
    if (!usuario) {
        throw criarErroDeSessao('sessao_encerrada', 'Sessao encerrada. Faca login novamente.');
    }

    return { payload, sessaoId, usuario };
}

module.exports = {
    ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    buscarUsuarioPorRefreshToken,
    criarAccessToken,
    criarSessao,
    hashRefreshToken,
    revogarRefreshToken,
    validarAccessTokenAtivo,
};
