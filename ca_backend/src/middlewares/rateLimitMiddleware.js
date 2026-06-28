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

    return (req, res, next) => {
        const agora = Date.now();
        limparExpirados(agora);

        const chave = keyGenerator
            ? keyGenerator(req)
            : `${req.ip}:${req.method}:${req.originalUrl}`;

        const registroAtual = tentativas.get(chave);
        const registro = registroAtual && registroAtual.resetAt > agora
            ? registroAtual
            : { count: 0, resetAt: agora + windowMs };

        registro.count += 1;
        tentativas.set(chave, registro);

        const remaining = Math.max(max - registro.count, 0);
        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(Math.ceil(registro.resetAt / 1000)));

        if (registro.count > max) {
            return res.status(429).json({ erro: message });
        }

        return next();
    };
}

function chavePorIpEmail(req) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${req.ip}:${req.method}:${req.originalUrl}:${email || 'sem-email'}`;
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

module.exports = {
    criarRateLimiter,
    authRateLimit,
    cadastroRateLimit,
};
