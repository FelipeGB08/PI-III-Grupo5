const express = require('express');

jest.mock('../../src/models/UserModel', () => ({
    buscarPorEmail: jest.fn(),
    criarUsuario: jest.fn(),
    criarUsuarioProfissionalCompleto: jest.fn(),
}));

const UserModel = require('../../src/models/UserModel');
const authRoutes = require('../../src/routes/authRoutes');
const userRoutes = require('../../src/routes/userRoutes');
const {
    cadastroPublicoMiddlewares,
    loginPublicoMiddlewares,
} = require('../../src/middlewares/publicRegistrationMiddleware');
const {
    authRateLimit,
    cadastroRateLimit,
} = require('../../src/middlewares/rateLimitMiddleware');

function handlersDaRota(router, caminho) {
    const camada = router.stack.find((item) => item.route?.path === caminho);
    return camada.route.stack.map((item) => item.handle);
}

describe('rotas publicas de cadastro', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);
        app.use('/api/usuarios', userRoutes);
        app.use('/api/v1/auth', authRoutes);
        app.use('/api/v1/usuarios', userRoutes);

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
    });

    beforeEach(() => {
        authRateLimit.resetar();
        cadastroRateLimit.resetar();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((erro) => (erro ? reject(erro) : resolve()));
        });
    });

    test('todos os aliases usam os mesmos middlewares de cadastro', () => {
        expect(handlersDaRota(authRoutes, '/register').slice(0, 2)).toEqual(
            cadastroPublicoMiddlewares
        );
        expect(handlersDaRota(authRoutes, '/registro').slice(0, 2)).toEqual(
            cadastroPublicoMiddlewares
        );
        expect(handlersDaRota(userRoutes, '/registro').slice(0, 2)).toEqual(
            cadastroPublicoMiddlewares
        );
    });

    test('os aliases de login usam o mesmo schema e limitador de tentativas', () => {
        expect(handlersDaRota(authRoutes, '/login').slice(0, 2)).toEqual(
            loginPublicoMiddlewares
        );
        expect(handlersDaRota(userRoutes, '/login').slice(0, 2)).toEqual(
            loginPublicoMiddlewares
        );
    });

    test.each([
        '/api/auth/register',
        '/api/auth/registro',
        '/api/usuarios/registro',
    ])('rejeita perfil admin em %s antes de criar usuario', async (caminho) => {
        const resposta = await fetch(`${baseUrl}${caminho}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: 'Administrador Indevido',
                email: 'admin@exemplo.com',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'admin',
            }),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'perfil_tipo deve ser "cidadao" ou "profissional".',
        });
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
        expect(UserModel.criarUsuario).not.toHaveBeenCalled();
        expect(UserModel.criarUsuarioProfissionalCompleto).not.toHaveBeenCalled();
    });

    test.each([
        '/api/auth/registro',
        '/api/usuarios/registro',
    ])('rejeita email invalido no cadastro em %s antes do controller', async (caminho) => {
        const resposta = await fetch(`${baseUrl}${caminho}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: 'Pessoa Teste',
                email: 'email-invalido',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'cidadao',
            }),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Informe um e-mail valido.',
        });
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test.each([
        '/api/auth/login',
        '/api/usuarios/login',
    ])('rejeita payload de login invalido em %s antes do controller', async (caminho) => {
        const resposta = await fetch(`${baseUrl}${caminho}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'email-invalido', senha: 'qualquer' }),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Informe um e-mail valido.',
        });
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test('nao permite contornar o rate limit de login pelo alias legado', async () => {
        const payload = {
            email: 'limite@exemplo.com',
            senha: 'SenhaValida123',
        };

        for (let tentativa = 0; tentativa < authRateLimit.max; tentativa += 1) {
            const resposta = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            expect(resposta.status).toBe(401);
        }

        const peloAliasLegado = await fetch(`${baseUrl}/api/usuarios/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        expect(peloAliasLegado.status).toBe(429);
    });

    test('nao reinicia o limite de login ao alternar entre /api e /api/v1', async () => {
        const payload = {
            email: 'limite-versao@exemplo.com',
            senha: 'SenhaValida123',
        };

        for (let tentativa = 0; tentativa < authRateLimit.max; tentativa += 1) {
            const resposta = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            expect(resposta.status).toBe(401);
        }

        const resposta = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        expect(resposta.status).toBe(429);
        expect(resposta.headers.get('retry-after')).toBeTruthy();
    });

    test('nao reinicia o limite de cadastro ao alternar entre aliases e versões', async () => {
        const payload = {
            nome: 'Teste de limite',
            email: 'email-invalido',
            senha: 'SenhaValida123',
            perfil_tipo: 'cidadao',
        };

        for (let tentativa = 0; tentativa < cadastroRateLimit.max; tentativa += 1) {
            const resposta = await fetch(`${baseUrl}/api/usuarios/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            expect(resposta.status).toBe(400);
        }

        const resposta = await fetch(`${baseUrl}/api/v1/auth/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        expect(resposta.status).toBe(429);
        expect(resposta.headers.get('retry-after')).toBeTruthy();
    });
});
