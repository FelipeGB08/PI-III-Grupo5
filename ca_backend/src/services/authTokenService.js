const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshTokenModel = require('../models/RefreshTokenModel');

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;

function montarPayloadJwt(usuario) {
    return {
        id: usuario.id,
        perfil_tipo: usuario.perfil_tipo,
        tipo_usuario: usuario.perfil_tipo,
    };
}

function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function criarAccessToken(usuario) {
    return jwt.sign(
        montarPayloadJwt(usuario),
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

    await RefreshTokenModel.criar({
        usuarioId: usuario.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiraEm,
    });

    return {
        accessToken: criarAccessToken(usuario),
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

module.exports = {
    ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    buscarUsuarioPorRefreshToken,
    criarAccessToken,
    criarSessao,
    hashRefreshToken,
    revogarRefreshToken,
};
