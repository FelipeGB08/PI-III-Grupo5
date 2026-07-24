const crypto = require('crypto');

const ANDROID_APP_PACKAGE = 'com.amauc.conecta';
const APPLE_CONTEXT_MAX_AGE_SECONDS = 5 * 60;
const PLATAFORMAS_APPLE = new Set(['ios', 'android', 'web']);

function criarErroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function texto(valor) {
    return String(valor || '').trim();
}

function validarPlataformaApple(platform) {
    const normalizada = texto(platform).toLowerCase();
    if (!PLATAFORMAS_APPLE.has(normalizada)) {
        throw criarErroHttp(400, 'platform deve ser ios, android ou web.');
    }
    return normalizada;
}

function exigirVariavel(nome, env = process.env) {
    const valor = texto(env[nome]);
    if (!valor) {
        throw criarErroHttp(
            503,
            `Login Apple indisponivel: configure ${nome} no servidor.`
        );
    }
    return valor;
}

function urlHttpsValida(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === 'https:' &&
            !url.username &&
            !url.password &&
            !url.hash;
    } catch (_) {
        return false;
    }
}

function obterAudienceApple(platform, env = process.env) {
    const plataforma = validarPlataformaApple(platform);
    const nomeVariavel = plataforma === 'ios'
        ? 'APPLE_IOS_CLIENT_ID'
        : 'APPLE_SERVICES_ID';
    return exigirVariavel(nomeVariavel, env);
}

function hash(valor) {
    return crypto.createHash('sha256').update(valor).digest('base64url');
}

function compararSeguro(valorA, valorB) {
    const bufferA = Buffer.from(texto(valorA));
    const bufferB = Buffer.from(texto(valorB));
    return bufferA.length > 0 &&
        bufferA.length === bufferB.length &&
        crypto.timingSafeEqual(bufferA, bufferB);
}

function segredoContextoApple(env = process.env) {
    return exigirVariavel('JWT_SECRET', env);
}

function assinarContextoApple(payload, env = process.env) {
    const conteudo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const assinatura = crypto
        .createHmac('sha256', segredoContextoApple(env))
        .update(conteudo)
        .digest('base64url');
    return `${conteudo}.${assinatura}`;
}

function lerContextoApple(state, env = process.env) {
    const partes = texto(state).split('.');
    if (partes.length !== 2 || !partes[0] || !partes[1]) {
        throw criarErroHttp(401, 'Contexto do login Apple invalido ou expirado.');
    }
    const [conteudo, assinatura] = partes;

    const assinaturaEsperada = crypto
        .createHmac('sha256', segredoContextoApple(env))
        .update(conteudo)
        .digest('base64url');
    if (!compararSeguro(assinatura, assinaturaEsperada)) {
        throw criarErroHttp(401, 'Contexto do login Apple invalido ou expirado.');
    }

    try {
        return JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8'));
    } catch (_) {
        throw criarErroHttp(401, 'Contexto do login Apple invalido ou expirado.');
    }
}

function criarContextoApple(platform, env = process.env, {
    agora = Date.now(),
    randomBytes = crypto.randomBytes,
} = {}) {
    const plataforma = validarPlataformaApple(platform);
    const nonce = randomBytes(32).toString('base64url');
    const state = assinarContextoApple({
        purpose: 'apple-social-login',
        platform: plataforma,
        nonce_hash: hash(nonce),
        exp: Math.floor(agora / 1000) + APPLE_CONTEXT_MAX_AGE_SECONDS,
    }, env);

    return { nonce, state };
}

function validarContextoApple({
    platform,
    state,
    nonce,
}, env = process.env, { agora = Date.now() } = {}) {
    const plataforma = validarPlataformaApple(platform);
    const nonceNormalizado = texto(nonce);
    if (!texto(state) || !nonceNormalizado) {
        throw criarErroHttp(
            400,
            'platform, state e nonce sao obrigatorios no login Apple.'
        );
    }

    const contexto = lerContextoApple(state, env);
    const agoraSegundos = Math.floor(agora / 1000);
    if (
        contexto.purpose !== 'apple-social-login' ||
        contexto.platform !== plataforma ||
        !Number.isInteger(contexto.exp) ||
        contexto.exp <= agoraSegundos ||
        !compararSeguro(contexto.nonce_hash, hash(nonceNormalizado))
    ) {
        throw criarErroHttp(401, 'Contexto do login Apple invalido ou expirado.');
    }

    return {
        audience: obterAudienceApple(plataforma, env),
        nonce: nonceNormalizado,
    };
}

function validarNonceTokenApple(claimNonce, nonceEsperado) {
    if (!compararSeguro(claimNonce, nonceEsperado)) {
        throw criarErroHttp(
            401,
            'Identity token Apple nao corresponde ao nonce desta autenticacao.'
        );
    }
}

function obterConfiguracaoApple(platform, env = process.env, dependencias = {}) {
    const plataforma = validarPlataformaApple(platform);
    const contexto = criarContextoApple(plataforma, env, dependencias);
    const configuracao = {
        client_id: obterAudienceApple(plataforma, env),
        platform: plataforma,
        state: contexto.state,
        nonce: contexto.nonce,
        expires_in: APPLE_CONTEXT_MAX_AGE_SECONDS,
    };

    if (plataforma === 'ios') return configuracao;

    const nomeRedirect = plataforma === 'android'
        ? 'APPLE_ANDROID_REDIRECT_URI'
        : 'APPLE_WEB_REDIRECT_URI';
    const redirectUri = exigirVariavel(nomeRedirect, env);
    if (!urlHttpsValida(redirectUri)) {
        throw criarErroHttp(
            503,
            `${nomeRedirect} deve ser uma URL HTTPS valida, sem fragmento.`
        );
    }

    return {
        ...configuracao,
        redirect_uri: redirectUri,
    };
}

function adicionarCampoSeguro(params, nome, valor) {
    if (typeof valor === 'string' && valor) {
        params.set(nome, valor);
    }
}

const AppleAuthController = {
    configuracao: (req, res) => {
        try {
            const platform = texto(req.query?.platform).toLowerCase();
            return res.status(200).json(obterConfiguracaoApple(platform));
        } catch (erro) {
            return res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : 'Erro interno no servidor.',
            });
        }
    },

    callbackAndroid: (req, res) => {
        const body = req.body || {};
        const code = texto(body.code);
        const identityToken = texto(body.id_token);
        const erroApple = texto(body.error);

        if ((!code || !identityToken) && !erroApple) {
            return res.status(400).json({
                erro: 'Retorno Apple invalido: code e id_token sao obrigatorios.',
            });
        }

        // Apenas dados retornados pela Apple sao encaminhados ao aplicativo. A
        // URL de destino e o package sao fixos no servidor: nunca use um
        // redirect_uri fornecido pelo cliente nesse ponto.
        const params = new URLSearchParams();
        adicionarCampoSeguro(params, 'code', code);
        adicionarCampoSeguro(params, 'id_token', identityToken);
        adicionarCampoSeguro(params, 'state', texto(body.state));
        adicionarCampoSeguro(params, 'user', texto(body.user));
        adicionarCampoSeguro(params, 'error', erroApple);
        adicionarCampoSeguro(params, 'error_description', texto(body.error_description));

        const destino =
            `intent://callback?${params.toString()}` +
            `#Intent;package=${ANDROID_APP_PACKAGE};scheme=signinwithapple;end`;

        res.set('Cache-Control', 'no-store');
        return res.redirect(303, destino);
    },
};

module.exports = {
    ...AppleAuthController,
    criarContextoApple,
    obterAudienceApple,
    obterConfiguracaoApple,
    validarContextoApple,
    validarNonceTokenApple,
};
