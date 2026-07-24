jest.mock('../../src/models/RefreshTokenModel', () => ({
    criar: jest.fn(),
    buscarValidoPorHash: jest.fn(),
    buscarUsuarioPorSessaoAtiva: jest.fn(),
    revogarPorHash: jest.fn(),
}));

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshTokenModel = require('../../src/models/RefreshTokenModel');
const authTokenService = require('../../src/services/authTokenService');

const usuario = {
    id: 42,
    perfil_tipo: 'cidadao',
};

describe('authTokenService', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'segredo-de-teste-refresh-token';
        RefreshTokenModel.criar.mockResolvedValue({ id: 1 });
    });

    test('cria access token de 15 minutos e persiste somente o hash do refresh token', async () => {
        const antes = Date.now();
        const sessao = await authTokenService.criarSessao(usuario);
        const payload = jwt.verify(sessao.accessToken, process.env.JWT_SECRET);
        const registro = RefreshTokenModel.criar.mock.calls[0][0];

        expect(payload.id).toBe(usuario.id);
        expect(payload.perfil_tipo).toBe('cidadao');
        expect(payload.sid).toBe('1');
        expect(payload.exp - payload.iat).toBe(15 * 60);
        expect(payload.jti).toBeTruthy();
        expect(sessao.expiresIn).toBe(15 * 60);
        expect(sessao.refreshToken).toHaveLength(64);
        expect(registro.usuarioId).toBe(usuario.id);
        expect(registro.tokenHash).toBe(
            crypto.createHash('sha256').update(sessao.refreshToken).digest('hex')
        );
        expect(registro.tokenHash).not.toBe(sessao.refreshToken);
        expect(registro.expiraEm.getTime()).toBeGreaterThan(
            antes + 29 * 24 * 60 * 60 * 1000
        );
    });

    test('consulta e revoga refresh token usando somente o hash', async () => {
        const refreshToken = 'r'.repeat(64);
        const hash = authTokenService.hashRefreshToken(refreshToken);
        RefreshTokenModel.buscarValidoPorHash.mockResolvedValue(usuario);
        RefreshTokenModel.revogarPorHash.mockResolvedValue({ id: 1 });

        await expect(
            authTokenService.buscarUsuarioPorRefreshToken(refreshToken)
        ).resolves.toBe(usuario);
        await expect(
            authTokenService.revogarRefreshToken(refreshToken)
        ).resolves.toEqual({ id: 1 });

        expect(RefreshTokenModel.buscarValidoPorHash).toHaveBeenCalledWith(hash);
        expect(RefreshTokenModel.revogarPorHash).toHaveBeenCalledWith(hash);
    });

    test('recusa access token quando a sessao foi revogada ou a conta ficou inativa', async () => {
        const accessToken = authTokenService.criarAccessToken(usuario, 12);
        RefreshTokenModel.buscarUsuarioPorSessaoAtiva.mockResolvedValue(null);

        await expect(
            authTokenService.validarAccessTokenAtivo(accessToken)
        ).rejects.toMatchObject({
            codigo: 'sessao_encerrada',
        });

        expect(RefreshTokenModel.buscarUsuarioPorSessaoAtiva).toHaveBeenCalledWith({
            sessaoId: '12',
            usuarioId: usuario.id,
        });
    });

    test('aceita access token somente enquanto a sessao e a conta continuam ativas', async () => {
        const accessToken = authTokenService.criarAccessToken(usuario, 12);
        RefreshTokenModel.buscarUsuarioPorSessaoAtiva.mockResolvedValue(usuario);

        await expect(
            authTokenService.validarAccessTokenAtivo(accessToken)
        ).resolves.toMatchObject({
            sessaoId: '12',
            usuario,
        });
    });
});
