const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const OAuthLoginTicketModel = require('../models/OAuthLoginTicketModel');
const logger = require('../utils/logger');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../services/authResponseService');
const {
    obterOuCriarUsuarioSocial,
} = require('./SocialAuthController');
const { cidadePermitida } = require('../config/amaucCidades');

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';
const CALLBACK_SCHEME = 'conecta-amauc-auth';
const STATE_MAX_AGE_SECONDS = 10 * 60;
const TICKET_MAX_AGE_MS = 5 * 60 * 1000;

function criarErroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function texto(valor) {
    return String(valor || '').trim();
}

function exigirEnv(nome, env = process.env) {
    const valor = texto(env[nome]);
    if (!valor) {
        throw criarErroHttp(
            503,
            `Login GitHub indisponivel: configure ${nome} no servidor.`
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

function hash(valor) {
    return crypto.createHash('sha256').update(valor).digest('hex');
}

function segredoState(env = process.env) {
    return exigirEnv('JWT_SECRET', env);
}

function assinarState(payload, env = process.env) {
    const conteudo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const assinatura = crypto
        .createHmac('sha256', segredoState(env))
        .update(conteudo)
        .digest('base64url');
    return `${conteudo}.${assinatura}`;
}

function validarPlataforma(platform) {
    if (!['android', 'ios', 'web'].includes(platform)) {
        throw criarErroHttp(400, 'platform deve ser android, ios ou web.');
    }
    return platform;
}

function validarStateCliente(state) {
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(state)) {
        throw criarErroHttp(400, 'state de login invalido. Reinicie o login GitHub.');
    }
    return state;
}

function lerStateAssinado(state, env = process.env) {
    const [conteudo, assinatura] = texto(state).split('.');
    if (!conteudo || !assinatura) {
        throw criarErroHttp(401, 'state GitHub invalido ou expirado.');
    }

    const esperada = crypto
        .createHmac('sha256', segredoState(env))
        .update(conteudo)
        .digest('base64url');
    const assinaturaBuffer = Buffer.from(assinatura);
    const esperadaBuffer = Buffer.from(esperada);

    if (assinaturaBuffer.length !== esperadaBuffer.length ||
        !crypto.timingSafeEqual(assinaturaBuffer, esperadaBuffer)) {
        throw criarErroHttp(401, 'state GitHub invalido ou expirado.');
    }

    try {
        const dados = JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8'));
        const agora = Math.floor(Date.now() / 1000);
        const platform = validarPlataforma(texto(dados.platform));
        const stateCliente = validarStateCliente(texto(dados.state));
        if (!Number.isInteger(dados.exp) || dados.exp < agora) {
            throw criarErroHttp(401, 'state GitHub invalido ou expirado.');
        }
        return {
            platform,
            cidade: texto(dados.cidade),
            stateCliente,
        };
    } catch (erro) {
        if (erro.status) throw erro;
        throw criarErroHttp(401, 'state GitHub invalido ou expirado.');
    }
}

function criarStateOAuth({ platform, cidade, stateCliente }, env = process.env) {
    return assinarState({
        platform: validarPlataforma(platform),
        cidade: texto(cidade),
        state: validarStateCliente(stateCliente),
        exp: Math.floor(Date.now() / 1000) + STATE_MAX_AGE_SECONDS,
    }, env);
}

function callbackGithubUri(env = process.env) {
    const redirectUri = exigirEnv('GITHUB_REDIRECT_URI', env);
    if (!urlHttpsValida(redirectUri)) {
        throw criarErroHttp(
            503,
            'GITHUB_REDIRECT_URI deve ser uma URL HTTPS valida, sem fragmento.'
        );
    }
    return redirectUri;
}

function destinoResultado({ platform, ticket, state, erro }, env = process.env) {
    let destino;
    if (platform === 'web') {
        const urlWeb = exigirEnv('GITHUB_WEB_REDIRECT_URI', env);
        if (!urlHttpsValida(urlWeb)) {
            throw criarErroHttp(
                503,
                'GITHUB_WEB_REDIRECT_URI deve ser uma URL HTTPS valida, sem fragmento.'
            );
        }
        destino = new URL(urlWeb);
    } else {
        destino = new URL(`${CALLBACK_SCHEME}://github`);
    }

    destino.searchParams.set('state', state);
    if (ticket) destino.searchParams.set('ticket', ticket);
    if (erro) destino.searchParams.set('error', erro);
    return destino.toString();
}

function headersGithub(accessToken) {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Conecta-AMAUC',
    };
}

async function lerJsonGithub(resposta, mensagem) {
    if (!resposta.ok) {
        throw criarErroHttp(401, mensagem);
    }
    return resposta.json();
}

async function trocarCodePorToken(code, env = process.env) {
    const resposta = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Conecta-AMAUC',
        },
        body: JSON.stringify({
            client_id: exigirEnv('GITHUB_CLIENT_ID', env),
            client_secret: exigirEnv('GITHUB_CLIENT_SECRET', env),
            code,
            redirect_uri: callbackGithubUri(env),
        }),
    });
    const dados = await lerJsonGithub(resposta, 'Nao foi possivel trocar o codigo do GitHub.');
    const accessToken = texto(dados.access_token);
    if (!accessToken || dados.error) {
        throw criarErroHttp(401, 'Codigo GitHub invalido, expirado ou ja utilizado.');
    }
    return accessToken;
}

async function buscarPerfilGithub(accessToken) {
    const headers = headersGithub(accessToken);
    const perfil = await lerJsonGithub(
        await fetch(GITHUB_USER_URL, { headers }),
        'Token GitHub invalido.'
    );
    const emails = await lerJsonGithub(
        await fetch(GITHUB_EMAILS_URL, { headers }),
        'Nao foi possivel consultar o e-mail GitHub.'
    );
    const principal = Array.isArray(emails)
        ? emails.find((item) => item.primary && item.verified) ||
            emails.find((item) => item.verified)
        : null;

    if (!principal?.email) {
        throw criarErroHttp(401, 'Conta GitHub sem e-mail verificado.');
    }

    return {
        providerId: String(perfil.id),
        email: principal.email,
        nome: perfil.name || perfil.login,
        fotoUrl: perfil.avatar_url || null,
    };
}

function responderCallbackComErro(res, state, erro, env = process.env) {
    const destino = destinoResultado({
        platform: state.platform,
        state: state.stateCliente,
        erro,
    }, env);
    res.set('Cache-Control', 'no-store');
    return res.redirect(303, destino);
}

function responderErroCallbackSeguro(res, state, erro) {
    try {
        return responderCallbackComErro(res, state, erro);
    } catch (erroResposta) {
        return res.status(erroResposta.status || 500).json({
            erro: erroResposta.status
                ? erroResposta.message
                : 'Erro interno no servidor.',
        });
    }
}

const GithubOAuthController = {
    autorizar: (req, res) => {
        try {
            const platform = validarPlataforma(texto(req.query?.platform).toLowerCase());
            const stateCliente = validarStateCliente(texto(req.query?.state));
            const cidade = texto(req.query?.cidade_amauc);
            if (!cidadePermitida(cidade)) {
                throw criarErroHttp(403, 'Informe uma cidade AMAUC valida antes de entrar com GitHub.');
            }
            const state = criarStateOAuth({
                platform,
                cidade,
                stateCliente,
            });
            const url = new URL(GITHUB_AUTHORIZE_URL);
            url.searchParams.set('client_id', exigirEnv('GITHUB_CLIENT_ID'));
            url.searchParams.set('redirect_uri', callbackGithubUri());
            url.searchParams.set('scope', 'read:user user:email');
            url.searchParams.set('state', state);
            return res.redirect(302, url.toString());
        } catch (erro) {
            return res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : 'Erro interno no servidor.',
            });
        }
    },

    callback: async (req, res) => {
        let state;
        try {
            state = lerStateAssinado(req.query?.state);
        } catch (erro) {
            return res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : 'Erro interno no servidor.',
            });
        }

        if (texto(req.query?.error)) {
            return responderErroCallbackSeguro(res, state, 'Login GitHub cancelado.');
        }

        const code = texto(req.query?.code);
        if (!code) {
            return responderErroCallbackSeguro(
                res,
                state,
                'GitHub nao retornou o codigo de autorizacao.'
            );
        }

        try {
            const accessToken = await trocarCodePorToken(code);
            const perfilSocial = await buscarPerfilGithub(accessToken);
            const usuario = await obterOuCriarUsuarioSocial({
                perfilSocial,
                provider: 'github',
                cidade: state.cidade,
            });
            const ticket = crypto.randomBytes(32).toString('base64url');
            await OAuthLoginTicketModel.criar({
                usuarioId: usuario.id,
                tokenHash: hash(ticket),
                stateHash: hash(state.stateCliente),
                expiraEm: new Date(Date.now() + TICKET_MAX_AGE_MS),
            });

            const destino = destinoResultado({
                platform: state.platform,
                ticket,
                state: state.stateCliente,
            });
            res.set('Cache-Control', 'no-store');
            return res.redirect(303, destino);
        } catch (erro) {
            logger.warn('Login OAuth GitHub recusado.', {
                componente: 'github_oauth',
                status: erro.status || 500,
                mensagem: erro.message,
            });
            return responderErroCallbackSeguro(
                res,
                state,
                erro.status ? erro.message : 'Falha ao concluir o login GitHub.'
            );
        }
    },

    concluir: async (req, res) => {
        try {
            const ticket = texto(req.body?.ticket);
            const state = texto(req.body?.state);
            if (!ticket || !state) {
                throw criarErroHttp(400, 'ticket e state sao obrigatorios.');
            }

            const dados = await OAuthLoginTicketModel.consumir({
                tokenHash: hash(ticket),
                stateHash: hash(state),
            });
            if (!dados) {
                throw criarErroHttp(401, 'Resultado do login GitHub invalido, expirado ou ja utilizado.');
            }

            const usuario = await UserModel.buscarPorId(dados.usuario_id);
            if (!usuario) {
                throw criarErroHttp(401, 'Usuario GitHub nao esta mais ativo.');
            }

            return res.status(200).json(
                await criarRespostaLogin(
                    usuario,
                    'Login com github realizado com sucesso!',
                    montarRespostaUsuario(usuario)
                )
            );
        } catch (erro) {
            return res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : 'Erro interno no servidor.',
            });
        }
    },
};

module.exports = {
    ...GithubOAuthController,
    criarStateOAuth,
    lerStateAssinado,
    buscarPerfilGithub,
    trocarCodePorToken,
};
