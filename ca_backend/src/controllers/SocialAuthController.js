const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const logger = require('../utils/logger');
const { cidadePermitida, CIDADES_AMAUC } = require('../config/amaucCidades');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../services/authResponseService');

function criarErroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function exigirEnv(nome) {
    const valor = process.env[nome];
    if (!valor) {
        throw criarErroHttp(500, `${nome} não configurado no servidor.`);
    }
    return valor;
}

function decodificarJwtHeader(token) {
    const [header] = String(token || '').split('.');
    if (!header) throw criarErroHttp(401, 'Token social mal formatado.');
    try {
        const decodificado = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
        if (!decodificado.kid) {
            throw criarErroHttp(401, 'Token social sem identificador de chave publica.');
        }
        return decodificado;
    } catch (erro) {
        if (erro.status) throw erro;
        throw criarErroHttp(401, 'Token social mal formatado.');
    }
}

async function buscarJson(url, options = {}) {
    const resposta = await fetch(url, options);
    if (!resposta.ok) {
        throw criarErroHttp(401, 'Não foi possível validar o token social.');
    }
    return resposta.json();
}

async function buscarChavePublica(jwksUrl, kid) {
    const jwks = await buscarJson(jwksUrl);
    const jwk = jwks.keys?.find((key) => key.kid === kid);
    if (!jwk) {
        throw criarErroHttp(401, 'Chave pública do token social não encontrada.');
    }
    return crypto
        .createPublicKey({ key: jwk, format: 'jwk' })
        .export({ type: 'spki', format: 'pem' });
}

async function verificarJwtSocial({ token, jwksUrl, issuer, audience }) {
    const header = decodificarJwtHeader(token);
    const publicKey = await buscarChavePublica(jwksUrl, header.kid);
    try {
        return jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer,
            audience,
        });
    } catch (_) {
        // Inclui assinatura, expiração, issuer e audience inválidos, sem
        // enfraquecer a verificação criptográfica realizada por jwt.verify.
        throw criarErroHttp(
            401,
            'Token social invalido, expirado ou destinado a outro aplicativo.'
        );
    }
}

async function verificarTokenSocial(provider, token) {
    if (!token) {
        throw criarErroHttp(400, 'Token do provedor social é obrigatório.');
    }

    if (provider === 'google') {
        const claims = await verificarJwtSocial({
            token,
            jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
            issuer: ['https://accounts.google.com', 'accounts.google.com'],
            audience: exigirEnv('GOOGLE_CLIENT_ID'),
        });
        if (claims.email_verified !== true && claims.email_verified !== 'true') {
            throw criarErroHttp(401, 'Token Google válido, mas e-mail não verificado.');
        }
        if (!claims.email || typeof claims.email !== 'string') {
            throw criarErroHttp(401, 'Token Google valido, mas sem e-mail.');
        }
        return {
            providerId: claims.sub,
            email: claims.email,
            nome: claims.name || claims.email?.split('@')[0],
            fotoUrl: claims.picture || null,
        };
    }

    throw criarErroHttp(400, 'provider deve ser google.');
}

async function obterOuCriarUsuarioSocial({ perfilSocial, provider, cidade }) {
    const emailNormalizado = String(perfilSocial.email || '').trim().toLowerCase();
    let usuario = await UserModel.buscarPorEmail(emailNormalizado);

    if (usuario?.ativo === false) {
        throw criarErroHttp(401, 'Esta conta foi removida e nao pode mais ser acessada.');
    }

    if (!usuario) {
        const cidadeValidada = cidadePermitida(cidade);
        if (!cidadeValidada) {
            const erro = criarErroHttp(
                403,
                'RF01 — Cadastro social restrito à região AMAUC. Informe uma cidade permitida.'
            );
            erro.cidadesPermitidas = CIDADES_AMAUC;
            throw erro;
        }

        const nomeSocial = String(perfilSocial.nome || emailNormalizado.split('@')[0]).trim();
        const senhaSocialHash = await bcrypt.hash(
            `${provider}:${perfilSocial.providerId || emailNormalizado}:${Date.now()}`,
            10
        );

        usuario = await UserModel.criarUsuario(
            nomeSocial.length >= 2 ? nomeSocial : 'Usuário AMAUC',
            emailNormalizado,
            senhaSocialHash,
            null,
            cidadeValidada,
            'cidadao'
        );
    }

    return usuario;
}

const SocialAuthController = {
    loginSocial: async (req, res) => {
        try {
            const {
                provider,
                token,
                id_token,
                access_token,
                cidade_amauc,
                cidade,
            } = req.body;

            const providerNormalizado = String(provider || '').toLowerCase();
            const tokenSocial = token || id_token || access_token;
            const perfilSocial = await verificarTokenSocial(
                providerNormalizado,
                tokenSocial
            );
            const usuario = await obterOuCriarUsuarioSocial({
                perfilSocial,
                provider: providerNormalizado,
                cidade: cidade_amauc || cidade,
            });

            return res.status(200).json(
                await criarRespostaLogin(
                    usuario,
                    `Login com ${providerNormalizado} realizado com sucesso!`,
                    {
                        ...montarRespostaUsuario(usuario),
                        foto_url: usuario.foto_url || perfilSocial.fotoUrl || null,
                    }
                )
            );
        } catch (erro) {
            const contexto = {
                erro,
                componente: 'autenticacao_social',
                status: erro.status || 500,
            };
            if (erro.status && erro.status < 500) {
                logger.warn('Login social recusado.', contexto);
            } else {
                logger.error('Falha no login social.', contexto);
            }
            const corpo = {
                erro: erro.status ? erro.message : 'Erro interno no servidor.',
            };
            if (erro.cidadesPermitidas) {
                corpo.cidades_permitidas = erro.cidadesPermitidas;
            }
            return res.status(erro.status || 500).json(corpo);
        }
    },
};

module.exports = {
    ...SocialAuthController,
    obterOuCriarUsuarioSocial,
};
