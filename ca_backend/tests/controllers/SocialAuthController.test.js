jest.mock('bcrypt', () => ({
    hash: jest.fn(),
}));

jest.mock('crypto', () => ({
    ...jest.requireActual('crypto'),
    createPublicKey: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

jest.mock('../../src/models/UserModel', () => ({
    buscarPorEmail: jest.fn(),
    criarUsuario: jest.fn(),
}));

jest.mock('../../src/services/authResponseService', () => ({
    criarRespostaLogin: jest.fn(),
    montarRespostaUsuario: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
}));

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserModel = require('../../src/models/UserModel');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../../src/services/authResponseService');
const SocialAuthController = require('../../src/controllers/SocialAuthController');
const { criarRespostaMock } = require('../helpers/httpMocks');

const googleAudience = 'web-client.apps.googleusercontent.com';
const tokenComKid = 'eyJraWQiOiJjaGF2ZS10ZXN0ZSJ9.payload.signature';
const fetchOriginal = global.fetch;
const googleClaimsValidos = {
    sub: 'google-user-1',
    email: 'ana@exemplo.com',
    name: 'Ana Exemplo',
    email_verified: true,
};

describe('SocialAuthController.loginSocial - Google', () => {
    const googleClientIdOriginal = process.env.GOOGLE_CLIENT_ID;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GOOGLE_CLIENT_ID = googleAudience;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ keys: [{ kid: 'chave-teste' }] }),
        });
        crypto.createPublicKey.mockReturnValue({
            export: jest.fn().mockReturnValue('chave-publica-falsa'),
        });
        montarRespostaUsuario.mockImplementation((usuario) => usuario);
        criarRespostaLogin.mockResolvedValue({
            token: 'access-token',
            refresh_token: 'refresh-token',
        });
    });

    afterAll(() => {
        global.fetch = fetchOriginal;
        if (googleClientIdOriginal === undefined) {
            delete process.env.GOOGLE_CLIENT_ID;
        } else {
            process.env.GOOGLE_CLIENT_ID = googleClientIdOriginal;
        }
    });

    test('aceita token válido e valida o audience configurado no backend', async () => {
        jwt.verify.mockReturnValue(googleClaimsValidos);
        UserModel.buscarPorEmail.mockResolvedValue({
            id: 21,
            ...googleClaimsValidos,
            ativo: true,
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({
            body: { provider: 'google', token: tokenComKid },
        }, res);

        expect(jwt.verify).toHaveBeenCalledWith(
            tokenComKid,
            'chave-publica-falsa',
            expect.objectContaining({
                algorithms: ['RS256'],
                audience: googleAudience,
                issuer: ['https://accounts.google.com', 'accounts.google.com'],
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            token: 'access-token',
            refresh_token: 'refresh-token',
        });
    });

    test('rejeita token cujo audience não corresponde ao Web Client ID', async () => {
        jwt.verify.mockImplementation(() => {
            const erro = new Error('jwt audience invalid');
            erro.name = 'JsonWebTokenError';
            throw erro;
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({
            body: { provider: 'google', token: tokenComKid },
        }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Token social invalido, expirado ou destinado a outro aplicativo.',
        });
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test('rejeita token Google com e-mail não verificado', async () => {
        jwt.verify.mockReturnValue({
            ...googleClaimsValidos,
            email_verified: false,
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({
            body: { provider: 'google', token: tokenComKid },
        }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });
});
