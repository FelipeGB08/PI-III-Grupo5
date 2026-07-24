const {
    authRateLimit,
    chatRateLimit,
    chavePorIpRota,
    chavePorUsuario,
    criarRateLimiter,
    solicitacaoRateLimit,
    uploadRateLimit,
} = require('../../src/middlewares/rateLimitMiddleware');
const authRoutes = require('../../src/routes/authRoutes');

function criarRespostaMock() {
    const res = {};
    res.setHeader = jest.fn();
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('rateLimitMiddleware', () => {
    beforeEach(() => {
        authRateLimit.resetar();
    });

    test('compartilha o contador entre /api e /api/v1 para a mesma rota pública', () => {
        const limiter = criarRateLimiter({
            windowMs: 60 * 1000,
            max: 1,
            message: 'Muitas tentativas.',
        });
        const next = jest.fn();
        const requisicaoApi = {
            ip: '127.0.0.1',
            method: 'POST',
            baseUrl: '/api/teste',
            path: '/acao',
            originalUrl: '/api/teste/acao?origem=teste',
        };
        const requisicaoV1 = {
            ip: '127.0.0.1',
            method: 'POST',
            baseUrl: '/api/v1/teste',
            path: '/acao',
            originalUrl: '/api/v1/teste?origem=teste',
        };
        const resposta = criarRespostaMock();

        expect(chavePorIpRota(requisicaoApi)).toBe(chavePorIpRota(requisicaoV1));

        limiter(requisicaoApi, criarRespostaMock(), next);
        limiter(requisicaoV1, resposta, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(resposta.status).toHaveBeenCalledWith(429);
        expect(resposta.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
        expect(resposta.json).toHaveBeenCalledWith({ erro: 'Muitas tentativas.' });
    });

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
        const usuarioUmApi = {
            ip: '10.0.0.1',
            baseUrl: '/api/solicitacoes',
            path: '/',
            usuarioLogado: { id: 1 },
        };
        const usuarioUmV1 = {
            ip: '10.0.0.1',
            baseUrl: '/api/v1/solicitacoes',
            path: '/',
            usuarioLogado: { id: 1 },
        };
        const usuarioDois = {
            ip: '10.0.0.1',
            baseUrl: '/api/v1/solicitacoes',
            path: '/',
            usuarioLogado: { id: 2 },
        };

        limiter(usuarioUmApi, criarRespostaMock(), jest.fn());

        const resMesmaSessao = criarRespostaMock();
        limiter(usuarioUmV1, resMesmaSessao, jest.fn());
        expect(resMesmaSessao.status).toHaveBeenCalledWith(429);

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

    test('refresh usa o limitador de auth e compartilha contador entre /api e /api/v1', () => {
        const rotaRefresh = authRoutes.stack.find((item) => (
            item.route?.path === '/refresh' && item.route.methods.post
        ));
        expect(rotaRefresh.route.stack[0].handle).toBe(authRateLimit);

        const refreshToken = 'refresh-opaco-da-sessao-um';
        for (let tentativa = 0; tentativa < authRateLimit.max; tentativa += 1) {
            const next = jest.fn();
            authRateLimit({
                ip: '10.0.0.8',
                method: 'POST',
                baseUrl: tentativa % 2 === 0 ? '/api/auth' : '/api/v1/auth',
                path: '/refresh',
                body: { refresh_token: refreshToken },
            }, criarRespostaMock(), next);
            expect(next).toHaveBeenCalledTimes(1);
        }

        const respostaBloqueada = criarRespostaMock();
        authRateLimit({
            ip: '10.0.0.8',
            method: 'POST',
            baseUrl: '/api/v1/auth',
            path: '/refresh',
            body: { refresh_token: refreshToken },
        }, respostaBloqueada, jest.fn());

        expect(respostaBloqueada.status).toHaveBeenCalledWith(429);
        expect(respostaBloqueada.setHeader).toHaveBeenCalledWith(
            'Retry-After',
            expect.any(String)
        );

        const respostaOutroTokenMesmoIp = criarRespostaMock();
        authRateLimit({
            ip: '10.0.0.8',
            method: 'POST',
            baseUrl: '/api/auth',
            path: '/refresh',
            body: { refresh_token: 'refresh-opaco-da-sessao-dois' },
        }, respostaOutroTokenMesmoIp, jest.fn());
        expect(respostaOutroTokenMesmoIp.status).toHaveBeenCalledWith(429);

        const outroIp = jest.fn();
        authRateLimit({
            ip: '10.0.0.9',
            method: 'POST',
            baseUrl: '/api/auth',
            path: '/refresh',
            body: { refresh_token: refreshToken },
        }, criarRespostaMock(), outroIp);
        expect(outroIp).toHaveBeenCalledTimes(1);
    });
});
