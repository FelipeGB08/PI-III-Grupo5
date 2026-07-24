const express = require('express');

jest.mock('../../src/models/UserModel', () => ({
    anonimizarConta: jest.fn(),
    buscarPorEmail: jest.fn(),
    buscarPorId: jest.fn(),
}));

jest.mock('../../src/services/authTokenService', () => ({
    ACCESS_TOKEN_EXPIRES_IN_SECONDS: 900,
    buscarUsuarioPorRefreshToken: jest.fn(),
    criarAccessToken: jest.fn(),
    revogarRefreshToken: jest.fn(),
    validarAccessTokenAtivo: jest.fn(),
}));

jest.mock('../../src/services/authResponseService', () => ({
    criarRespostaLogin: jest.fn(),
    montarRespostaUsuario: jest.fn(),
}));

jest.mock('../../src/services/chatSocketRegistry', () => ({
    desconectarSocketsDaSessao: jest.fn(),
    desconectarSocketsDoUsuario: jest.fn(),
}));

const UserModel = require('../../src/models/UserModel');
const {
    buscarUsuarioPorRefreshToken,
    revogarRefreshToken,
    validarAccessTokenAtivo,
} = require('../../src/services/authTokenService');
const {
    desconectarSocketsDaSessao,
    desconectarSocketsDoUsuario,
} = require('../../src/services/chatSocketRegistry');
const { authRateLimit } = require('../../src/middlewares/rateLimitMiddleware');
const authRoutes = require('../../src/routes/authRoutes');
const perfilRoutes = require('../../src/routes/perfilRoutes');

describe('rotas HTTP de seguranca de sessao', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use(express.json());
        app.use('/api/auth', authRoutes);
        app.use('/api/perfil', perfilRoutes);

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((erro) => (erro ? reject(erro) : resolve()));
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        authRateLimit.resetar();
    });

    test('logout revoga a sessao, impede refresh posterior e encerra o chat da sessao', async () => {
        revogarRefreshToken.mockResolvedValue({ id: 27, usuario_id: 8 });
        buscarUsuarioPorRefreshToken.mockResolvedValue(null);

        const logout = await fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: 'r'.repeat(64) }),
        });
        const refresh = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: 'r'.repeat(64) }),
        });

        expect(logout.status).toBe(200);
        expect(refresh.status).toBe(401);
        expect(desconectarSocketsDaSessao).toHaveBeenCalledWith(
            27,
            'Sessao encerrada por logout.'
        );
    });

    test('conta excluida tem as sessoes encerradas e nao usa outra rota protegida', async () => {
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 15, perfil_tipo: 'cidadao' },
            sessaoId: '8',
        });
        UserModel.anonimizarConta.mockResolvedValue({
            conta: { id: 15, ativo: false },
            refreshTokensRevogados: 2,
            arquivosParaRemover: [],
        });

        const exclusao = await fetch(`${baseUrl}/api/perfil/conta`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer access-token-ativo',
            },
            body: JSON.stringify({ confirmacao: 'EXCLUIR MINHA CONTA' }),
        });

        const erroSessao = new Error('Sessao encerrada. Faca login novamente.');
        erroSessao.codigo = 'sessao_encerrada';
        validarAccessTokenAtivo.mockRejectedValue(erroSessao);
        const tentativaPosterior = await fetch(`${baseUrl}/api/perfil/conta`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer access-token-revogado',
            },
            body: JSON.stringify({ confirmacao: 'EXCLUIR MINHA CONTA' }),
        });

        expect(exclusao.status).toBe(200);
        expect(desconectarSocketsDoUsuario).toHaveBeenCalledWith(
            15,
            'Conta removida e sessoes revogadas.'
        );
        expect(tentativaPosterior.status).toBe(401);
        expect(UserModel.anonimizarConta).toHaveBeenCalledTimes(1);
    });

    test('login HTTP recusa uma conta excluida ou inativa', async () => {
        UserModel.buscarPorEmail.mockResolvedValue({
            id: 15,
            email: 'removido-15@anon.local',
            senha_hash: 'hash-inutil',
            ativo: false,
        });

        const resposta = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'removido-15@anon.local',
                senha: 'SenhaValida123',
            }),
        });

        expect(resposta.status).toBe(401);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Email ou senha incorretos.',
        });
    });
});
