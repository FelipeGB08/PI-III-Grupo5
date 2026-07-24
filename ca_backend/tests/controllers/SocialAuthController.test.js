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
const { obterConfiguracaoApple } = require('../../src/controllers/AppleAuthController');
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

describe('SocialAuthController.loginSocial - Apple', () => {
    const jwtSecretOriginal = process.env.JWT_SECRET;
    const appleIosClientIdOriginal = process.env.APPLE_IOS_CLIENT_ID;
    const appleServicesIdOriginal = process.env.APPLE_SERVICES_ID;
    const appleAndroidRedirectOriginal = process.env.APPLE_ANDROID_REDIRECT_URI;
    const appleClientIdOriginal = process.env.APPLE_CLIENT_ID;
    const audiencesApple = [
        'com.amauc.conecta.ios',
        'com.amauc.conecta.web',
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET =
            'segredo-apple-de-teste-com-mais-de-trinta-e-dois-caracteres';
        process.env.APPLE_IOS_CLIENT_ID = audiencesApple[0];
        process.env.APPLE_SERVICES_ID = audiencesApple[1];
        process.env.APPLE_ANDROID_REDIRECT_URI =
            'https://api.example.test/api/v1/auth/apple/callback';
        delete process.env.APPLE_CLIENT_ID;
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
        for (const [nome, valor] of [
            ['JWT_SECRET', jwtSecretOriginal],
            ['APPLE_IOS_CLIENT_ID', appleIosClientIdOriginal],
            ['APPLE_SERVICES_ID', appleServicesIdOriginal],
            ['APPLE_ANDROID_REDIRECT_URI', appleAndroidRedirectOriginal],
            ['APPLE_CLIENT_ID', appleClientIdOriginal],
        ]) {
            if (valor === undefined) delete process.env[nome];
            else process.env[nome] = valor;
        }
    });

    function criarBodyApple(platform = 'ios') {
        const config = obterConfiguracaoApple(platform);
        return {
            body: {
                provider: 'apple',
                token: tokenComKid,
                platform,
                state: config.state,
                nonce: config.nonce,
            },
            nonce: config.nonce,
        };
    }

    test('valida o audience especifico do iOS, preservando issuer e nonce Apple', async () => {
        const contexto = criarBodyApple('ios');
        jwt.verify.mockReturnValue({
            sub: 'apple-user-1',
            email: 'ana@privaterelay.appleid.com',
            name: 'Ana Apple',
            nonce: contexto.nonce,
        });
        UserModel.buscarPorEmail.mockResolvedValue({
            id: 22,
            email: 'ana@privaterelay.appleid.com',
            ativo: true,
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({ body: contexto.body }, res);

        expect(jwt.verify).toHaveBeenCalledWith(
            tokenComKid,
            'chave-publica-falsa',
            expect.objectContaining({
                algorithms: ['RS256'],
                audience: audiencesApple[0],
                issuer: 'https://appleid.apple.com',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('usa Services ID como audience apenas no Android/Web', async () => {
        const contexto = criarBodyApple('android');
        jwt.verify.mockReturnValue({
            sub: 'apple-user-2',
            email: 'bia@privaterelay.appleid.com',
            nonce: contexto.nonce,
        });
        UserModel.buscarPorEmail.mockResolvedValue({
            id: 23,
            email: 'bia@privaterelay.appleid.com',
            ativo: true,
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({ body: contexto.body }, res);

        expect(jwt.verify).toHaveBeenCalledWith(
            tokenComKid,
            'chave-publica-falsa',
            expect.objectContaining({ audience: audiencesApple[1] })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rejeita identity token Apple com audience invalido', async () => {
        const contexto = criarBodyApple('ios');
        jwt.verify.mockImplementation(() => {
            throw new Error('jwt audience invalid');
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({ body: contexto.body }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test('rejeita identity token Apple com issuer invalido', async () => {
        const contexto = criarBodyApple('ios');
        jwt.verify.mockImplementation(() => {
            throw new Error('jwt issuer invalid');
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({ body: contexto.body }, res);

        expect(jwt.verify).toHaveBeenCalledWith(
            tokenComKid,
            'chave-publica-falsa',
            expect.objectContaining({ issuer: 'https://appleid.apple.com' })
        );
        expect(res.status).toHaveBeenCalledWith(401);
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test('rejeita identity token Apple sem e-mail', async () => {
        const contexto = criarBodyApple('ios');
        jwt.verify.mockReturnValue({
            sub: 'apple-user-1',
            nonce: contexto.nonce,
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({ body: contexto.body }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Token Apple válido, mas sem e-mail.',
        });
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test('rejeita identity token Apple sem a claim nonce', async () => {
        const contexto = criarBodyApple('ios');
        jwt.verify.mockReturnValue({
            sub: 'apple-user-1',
            email: 'ana@privaterelay.appleid.com',
        });
        const res = criarRespostaMock();

        await SocialAuthController.loginSocial({ body: contexto.body }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });

    test('rejeita state adulterado e nonce divergente antes de criar usuario', async () => {
        const contextoAdulterado = criarBodyApple('ios');
        const resState = criarRespostaMock();
        await SocialAuthController.loginSocial({
            body: {
                ...contextoAdulterado.body,
                state: `${contextoAdulterado.body.state}adulterado`,
            },
        }, resState);

        expect(resState.status).toHaveBeenCalledWith(401);
        expect(jwt.verify).not.toHaveBeenCalled();

        jest.clearAllMocks();
        const contextoNonce = criarBodyApple('ios');
        jwt.verify.mockReturnValue({
            sub: 'apple-user-1',
            email: 'ana@privaterelay.appleid.com',
            nonce: 'nonce-divergente',
        });
        const resNonce = criarRespostaMock();
        await SocialAuthController.loginSocial({ body: contextoNonce.body }, resNonce);

        expect(resNonce.status).toHaveBeenCalledWith(401);
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
    });
});

test('nao aceita mais access token GitHub enviado manualmente pelo cliente', async () => {
    const res = criarRespostaMock();

    await SocialAuthController.loginSocial({
        body: { provider: 'github', token: 'token-pessoal-nao-aceito' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        erro: 'provider deve ser google ou apple.',
    });
    expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
});
