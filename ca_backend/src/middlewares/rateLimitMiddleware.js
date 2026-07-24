function criarRateLimiter({
    windowMs = 15 * 60 * 1000,
    max = 20,
    keyGenerator,
    message = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
} = {}) {
    const tentativas = new Map();

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
        tentativas.set(chave, registro);

        return {
            permitido: registro.count <= max,
            remaining: Math.max(max - registro.count, 0),
            resetAt: registro.resetAt,
            retryAfter: Math.max(1, Math.ceil((registro.resetAt - agora) / 1000)),
        };
    }

    const middleware = (req, res, next) => {
        const chave = keyGenerator
            ? keyGenerator(req)
            : chavePorIpRota(req);
        const resultado = consumir(chave);

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(resultado.remaining));
        res.setHeader('RateLimit-Reset', String(Math.ceil(resultado.resetAt / 1000)));

        if (!resultado.permitido) {
            res.setHeader('Retry-After', String(resultado.retryAfter));
            return res.status(429).json({ erro: message });
        }

        return next();
    };

    middleware.consumir = consumir;
    middleware.resetar = () => tentativas.clear();
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
        return `${req.ip}:${acao}`;
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

const authRateLimit = criarRateLimiter({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
    keyGenerator: chavePorIpEmail,
});

const cadastroRateLimit = criarRateLimiter({
    windowMs: Number(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.REGISTER_RATE_LIMIT_MAX || 5),
    keyGenerator: chavePorIpEmail,
});

const solicitacaoRateLimit = criarRateLimiter({
    windowMs: Number(process.env.SOLICITACAO_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.SOLICITACAO_RATE_LIMIT_MAX || 20),
    keyGenerator: chavePorUsuario,
    message: 'Limite de criacao de solicitacoes atingido. Aguarde antes de tentar novamente.',
});

const chatRateLimit = criarRateLimiter({
    windowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.CHAT_RATE_LIMIT_MAX || 60),
    keyGenerator: chavePorUsuario,
    message: 'Limite de envio de mensagens atingido. Aguarde um minuto e tente novamente.',
});

const uploadRateLimit = criarRateLimiter({
    windowMs: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
    max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 30),
    keyGenerator: chavePorUsuario,
    message: 'Limite de upload de imagens atingido. Aguarde antes de enviar outra imagem.',
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
