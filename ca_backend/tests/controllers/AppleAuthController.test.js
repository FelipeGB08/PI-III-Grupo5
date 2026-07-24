const AppleAuthController = require('../../src/controllers/AppleAuthController');

function criarRespostaMock() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
}

describe('AppleAuthController', () => {
    const envOriginal = {
        JWT_SECRET: process.env.JWT_SECRET,
        APPLE_IOS_CLIENT_ID: process.env.APPLE_IOS_CLIENT_ID,
        APPLE_SERVICES_ID: process.env.APPLE_SERVICES_ID,
        APPLE_ANDROID_REDIRECT_URI: process.env.APPLE_ANDROID_REDIRECT_URI,
        APPLE_WEB_REDIRECT_URI: process.env.APPLE_WEB_REDIRECT_URI,
    };

    beforeEach(() => {
        process.env.JWT_SECRET =
            'segredo-apple-de-teste-com-mais-de-trinta-e-dois-caracteres';
        process.env.APPLE_IOS_CLIENT_ID = 'com.amauc.conecta.ios';
        process.env.APPLE_SERVICES_ID = 'com.amauc.conecta.web';
        process.env.APPLE_ANDROID_REDIRECT_URI =
            'https://api.example.test/api/auth/apple/callback';
        process.env.APPLE_WEB_REDIRECT_URI = 'https://app.example.test/';
    });

    afterAll(() => {
        for (const [nome, valor] of Object.entries(envOriginal)) {
            if (valor === undefined) delete process.env[nome];
            else process.env[nome] = valor;
        }
    });

    test('retorna somente a configuracao Android controlada pelo servidor', () => {
        const res = criarRespostaMock();

        AppleAuthController.configuracao({
            query: {
                platform: 'android',
                redirect_uri: 'https://atacante.example/callback',
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            client_id: 'com.amauc.conecta.web',
            redirect_uri: 'https://api.example.test/api/auth/apple/callback',
            platform: 'android',
            state: expect.any(String),
            nonce: expect.any(String),
            expires_in: 300,
        }));
    });

    test('recusa plataforma e redirect URI de servidor invalidos', () => {
        const resPlataforma = criarRespostaMock();
        AppleAuthController.configuracao({ query: { platform: 'windows' } }, resPlataforma);
        expect(resPlataforma.status).toHaveBeenCalledWith(400);

        process.env.APPLE_WEB_REDIRECT_URI = 'http://app.example.test/';
        const resRedirect = criarRespostaMock();
        AppleAuthController.configuracao({ query: { platform: 'web' } }, resRedirect);
        expect(resRedirect.status).toHaveBeenCalledWith(503);
    });

    test('separa o audience iOS e nao retorna redirect URI no fluxo nativo', () => {
        const config = AppleAuthController.obterConfiguracaoApple('ios');

        expect(config).toEqual(expect.objectContaining({
            client_id: 'com.amauc.conecta.ios',
            platform: 'ios',
            state: expect.any(String),
            nonce: expect.any(String),
        }));
        expect(config).not.toHaveProperty('redirect_uri');
    });

    test('valida state assinado, nonce e plataforma e recusa adulteracao ou expiracao', () => {
        const agora = Date.UTC(2026, 6, 23, 12, 0, 0);
        const config = AppleAuthController.obterConfiguracaoApple(
            'android',
            process.env,
            {
                agora,
                randomBytes: () => Buffer.alloc(32, 7),
            }
        );

        expect(AppleAuthController.validarContextoApple({
            platform: 'android',
            state: config.state,
            nonce: config.nonce,
        }, process.env, { agora: agora + 60_000 })).toEqual({
            audience: 'com.amauc.conecta.web',
            nonce: config.nonce,
        });
        expect(() => AppleAuthController.validarContextoApple({
            platform: 'ios',
            state: config.state,
            nonce: config.nonce,
        }, process.env, { agora: agora + 60_000 })).toThrow(/invalido ou expirado/);
        expect(() => AppleAuthController.validarContextoApple({
            platform: 'android',
            state: `${config.state}adulterado`,
            nonce: config.nonce,
        }, process.env, { agora: agora + 60_000 })).toThrow(/invalido ou expirado/);
        expect(() => AppleAuthController.validarContextoApple({
            platform: 'android',
            state: `${config.state}.segmento-extra`,
            nonce: config.nonce,
        }, process.env, { agora: agora + 60_000 })).toThrow(/invalido ou expirado/);
        expect(() => AppleAuthController.validarContextoApple({
            platform: 'android',
            state: config.state,
            nonce: 'nonce-divergente',
        }, process.env, { agora: agora + 60_000 })).toThrow(/invalido ou expirado/);
        expect(() => AppleAuthController.validarContextoApple({
            platform: 'android',
            state: config.state,
            nonce: config.nonce,
        }, process.env, { agora: agora + 301_000 })).toThrow(/invalido ou expirado/);
    });

    test('encaminha callback Android para intent fixo e ignora redirect_uri do corpo', () => {
        const res = criarRespostaMock();

        AppleAuthController.callbackAndroid({
            body: {
                code: 'codigo apple',
                id_token: 'token.apple.jwt',
                state: 'estado-original',
                redirect_uri: 'https://atacante.example/callback',
            },
        }, res);

        expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            'intent://callback?code=codigo+apple&id_token=token.apple.jwt&state=estado-original#Intent;package=com.amauc.conecta;scheme=signinwithapple;end'
        );
    });

    test('recusa callback sem code ou identity token', () => {
        const res = criarRespostaMock();

        AppleAuthController.callbackAndroid({ body: { code: 'codigo' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});
