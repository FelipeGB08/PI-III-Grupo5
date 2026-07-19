const {
    chatRateLimit,
    chavePorUsuario,
    criarRateLimiter,
    solicitacaoRateLimit,
    uploadRateLimit,
} = require('../../src/middlewares/rateLimitMiddleware');

function criarRespostaMock() {
    const res = {};
    res.setHeader = jest.fn();
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('rateLimitMiddleware', () => {
    test('bloqueia com 429 depois do limite e informa quando tentar novamente', () => {
        const limiter = criarRateLimiter({
            windowMs: 60 * 1000,
            max: 2,
            keyGenerator: chavePorUsuario,
            message: 'Limite de teste atingido.',
        });
        const req = { ip: '127.0.0.1', usuarioLogado: { id: 9 } };

        for (let tentativa = 0; tentativa < 2; tentativa += 1) {
            const res = criarRespostaMock();
            const next = jest.fn();
            limiter(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
        }

        const res = criarRespostaMock();
        const next = jest.fn();
        limiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({ erro: 'Limite de teste atingido.' });
        expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '2');
        expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '0');
        expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
        expect(next).not.toHaveBeenCalled();
    });

    test('usa o ID autenticado como chave, isolando usuários no mesmo IP', () => {
        const limiter = criarRateLimiter({
            max: 1,
            keyGenerator: chavePorUsuario,
        });
        const usuarioUm = { ip: '10.0.0.1', usuarioLogado: { id: 1 } };
        const usuarioDois = { ip: '10.0.0.1', usuarioLogado: { id: 2 } };

        limiter(usuarioUm, criarRespostaMock(), jest.fn());

        const resOutroUsuario = criarRespostaMock();
        const nextOutroUsuario = jest.fn();
        limiter(usuarioDois, resOutroUsuario, nextOutroUsuario);

        expect(nextOutroUsuario).toHaveBeenCalledTimes(1);
        expect(resOutroUsuario.status).not.toHaveBeenCalled();
    });

    test('mantem os limites generosos configurados para cada acao', () => {
        expect(solicitacaoRateLimit.max).toBe(20);
        expect(solicitacaoRateLimit.windowMs).toBe(60 * 60 * 1000);
        expect(chatRateLimit.max).toBe(60);
        expect(chatRateLimit.windowMs).toBe(60 * 1000);
        expect(uploadRateLimit.max).toBe(30);
        expect(uploadRateLimit.windowMs).toBe(60 * 60 * 1000);
    });
});
