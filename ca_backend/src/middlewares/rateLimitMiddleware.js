const crypto = require('crypto');
const { criarPostgresRateLimitStore } = require('../services/rateLimitStore');

function criarRateLimiter({
    windowMs = 15 * 60 * 1000,
    max = 20,
    keyGenerator,
    keyPrefix = '',
    estornarEmErro = false,
    message = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    store,
} = {}) {
    const tentativas = new Map();
    const maxChavesLocais = 10_000;

    function limparExpirados(agora) {
        for (const [chave, registro] of tentativas.entries()) {
            if (registro.resetAt <= agora) {
                tentativas.delete(chave);
            }
        }
    }

    function consumir(chave, agora = Date.now()) {
        limparExpirados(agora);
        const registroAtual = tentativas.get(chave);
        const registro = registroAtual && registroAtual.resetAt > agora
            ? registroAtual
            : { count: 0, resetAt: agora + windowMs };

        registro.count += 1;
        if (!tentativas.has(chave) && tentativas.size >= maxChavesLocais) {
            const primeiraChave = tentativas.keys().next().value;
            tentativas.delete(primeiraChave);
        }
        tentativas.set(chave, registro);

        return {
            count: registro.count,
            permitido: registro.count <= max,
            remaining: Math.max(max - registro.count, 0),
            resetAt: registro.resetAt,
            retryAfter: Math.max(1, Math.ceil((registro.resetAt - agora) / 1000)),
        };
    }

    function estornar(chave, agora = Date.now()) {
        limparExpirados(agora);
        const registro = tentativas.get(chave);
        if (!registro || registro.resetAt <= agora) return;
        registro.count = Math.max(0, registro.count - 1);
    }

    function responder(resultado, res, next, chave) {
        const permitido = resultado.count <= max;
        const remaining = Math.max(max - resultado.count, 0);
        const retryAfter = Math.max(1, Math.ceil((resultado.resetAt - Date.now()) / 1000));
        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(Math.ceil(resultado.resetAt / 1000)));

        if (!permitido) {
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({ erro: message });
        }

        if (estornarEmErro && typeof res.once === 'function') {
            res.once('finish', () => {
                if (res.statusCode < 400) return;
                const operacao = store
                    ? store.estornar({ chave })
                    : estornar(chave);
                Promise.resolve(operacao).catch(() => {});
            });
        }
        return next();
    }

    const middleware = (req, res, next) => {
        const chaveBase = keyGenerator
            ? keyGenerator(req)
            : chavePorIpRota(req);
        const chave = keyPrefix ? `${keyPrefix}:${chaveBase}` : chaveBase;
        if (store) {
            return store.consumir({ chave, windowMs })
                .then((resultado) => responder(resultado, res, next, chave))
                .catch(next);
        }
        const resultado = consumir(chave);
        return responder({
            count: resultado.count,
            resetAt: resultado.resetAt,
        }, res, next, chave);
    };

    middleware.consumir = consumir;
    middleware.estornar = estornar;
    middleware.resetar = () => (store ? store.resetar() : tentativas.clear());
    middleware.max = max;
    middleware.windowMs = windowMs;

    return middleware;
}

function normalizarCaminhoRateLimit(caminho) {
    const texto = String(caminho || '').replace(/\/+/g, '/');
    const comBarraInicial = texto.startsWith('/') ? texto : `/${texto}`;
    return comBarraInicial.replace(/^\/api\/v1(?=\/|$)/i, '/api');
}

function chavePorIpRota(req) {
    const baseUrl = normalizarCaminhoRateLimit(req.baseUrl || '');
    const caminho = String(req.path || req.route?.path || '');
    const rota = `${baseUrl}${caminho}` || '/';
    return `${req.ip}:${req.method}:${rota}`;
}

function acaoPublicaDeAuth(req) {
    const caminho = String(req.path || req.route?.path || '/auth').toLowerCase();
    if (caminho === '/register' || caminho === '/registro') return 'registro';
    return caminho.replace(/^\/+/, '') || 'auth';
}

function chavePorIpEmail(req) {
    const acao = acaoPublicaDeAuth(req);
    if (acao === 'refresh') {
        const token = String(req.body?.refresh_token || '');
        const fingerprint = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')
            .slice(0, 16);
        return `${req.ip}:${acao}:${fingerprint}`;
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${req.ip}:${acao}:${email || 'sem-email'}`;
}

function chavePorUsuarioId(usuarioId, ip = 'desconhecido') {
    return usuarioId ? `usuario:${usuarioId}` : `ip:${ip}`;
}

function chavePorUsuario(req) {
    const usuarioId = req.usuarioLogado?.id || req.usuario?.id || req.user?.id;
    return chavePorUsuarioId(usuarioId, req.ip);
}

const storeCompartilhado = process.env.NODE_ENV === 'test'
    ? null
    : criarPostgresRateLimitStore();

const authRateLimit = criarRateLimiter({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
    keyGenerator: chavePorIpEmail,
    store: storeCompartilhado,
});

const cadastroRateLimit = criarRateLimiter({
    windowMs: Number(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.REGISTER_RATE_LIMIT_MAX || 5),
    keyGenerator: chavePorIpEmail,
    store: storeCompartilhado,
});

const solicitacaoRateLimit = criarRateLimiter({
    windowMs: Number(process.env.SOLICITACAO_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.SOLICITACAO_RATE_LIMIT_MAX || 20),
    keyGenerator: chavePorUsuario,
    // Separa contadores criados antes de a validacao passar a ocorrer antes
    // do consumo da cota, evitando bloqueios por tentativas invalidas antigas.
    keyPrefix: 'solicitacao-v2',
    estornarEmErro: true,
    message: 'Limite de criacao de solicitacoes atingido. Aguarde antes de tentar novamente.',
    store: storeCompartilhado,
});

const chatRateLimit = criarRateLimiter({
    windowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.CHAT_RATE_LIMIT_MAX || 60),
    keyGenerator: chavePorUsuario,
    estornarEmErro: true,
    message: 'Limite de envio de mensagens atingido. Aguarde um minuto e tente novamente.',
    store: storeCompartilhado,
});

const uploadRateLimit = criarRateLimiter({
    windowMs: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 30),
    keyGenerator: chavePorUsuario,
    estornarEmErro: true,
    message: 'Limite de upload de imagens atingido. Aguarde antes de enviar outra imagem.',
    store: storeCompartilhado,
});

module.exports = {
    criarRateLimiter,
    authRateLimit,
    cadastroRateLimit,
    solicitacaoRateLimit,
    chatRateLimit,
    uploadRateLimit,
    chavePorUsuario,
    chavePorUsuarioId,
    chavePorIpRota,
};
