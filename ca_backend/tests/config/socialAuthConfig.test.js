const {
    avisarCredenciaisSociaisAusentes,
} = require('../../src/config/socialAuthConfig');

test('nao emite avisos fora de producao', () => {
    const logger = { warn: jest.fn() };

    const avisos = avisarCredenciaisSociaisAusentes(
        { NODE_ENV: 'development' },
        logger
    );

    expect(avisos).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
});

test('avisa sobre cada provedor incompleto em producao', () => {
    const logger = { warn: jest.fn() };

    const avisos = avisarCredenciaisSociaisAusentes(
        { NODE_ENV: 'production' },
        logger
    );

    expect(avisos.map((item) => item.provedor)).toEqual([
        'GOOGLE',
        'APPLE',
        'GITHUB',
    ]);
    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('GOOGLE_CLIENT_ID'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('APPLE_IOS_CLIENT_ID'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('GITHUB_CLIENT_SECRET'));
});

test('considera os valores do env example como placeholders', () => {
    const logger = { warn: jest.fn() };

    const avisos = avisarCredenciaisSociaisAusentes(
        {
            NODE_ENV: 'production',
            GOOGLE_CLIENT_ID: 'seu_google_oauth_client_id',
            APPLE_CLIENT_ID: 'seu_apple_services_id_ou_bundle_id',
            GITHUB_CLIENT_ID: 'seu_github_oauth_client_id',
            GITHUB_CLIENT_SECRET: 'seu_github_oauth_client_secret',
        },
        logger
    );

    expect(avisos).toHaveLength(3);
});

test('nao avisa quando todas as credenciais foram substituidas', () => {
    const logger = { warn: jest.fn() };

    const avisos = avisarCredenciaisSociaisAusentes(
        {
            NODE_ENV: 'production',
            GOOGLE_CLIENT_ID: 'web-client.apps.googleusercontent.com',
            APPLE_IOS_CLIENT_ID: 'com.amauc.conecta.ios',
            APPLE_SERVICES_ID: 'com.amauc.conecta.web',
            GITHUB_CLIENT_ID: 'Iv1.exemplo',
            GITHUB_CLIENT_SECRET: 'segredo-real-fora-do-repositorio',
            GITHUB_REDIRECT_URI: 'https://api.example.test/api/v1/auth/github/callback',
            GITHUB_WEB_REDIRECT_URI: 'https://app.example.test/auth.html',
        },
        logger
    );

    expect(avisos).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
});

test('avisa quando falta um dos audiences Apple da configuracao nova', () => {
    const logger = { warn: jest.fn() };

    const avisos = avisarCredenciaisSociaisAusentes(
        {
            NODE_ENV: 'production',
            APPLE_IOS_CLIENT_ID: 'com.amauc.conecta.ios',
        },
        logger
    );

    expect(avisos).toEqual(expect.arrayContaining([
        expect.objectContaining({
            provedor: 'APPLE',
            ausentes: ['APPLE_SERVICES_ID'],
        }),
    ]));
});

test('nao aceita APPLE_CLIENT_ID legado no lugar dos audiences por plataforma', () => {
    const logger = { warn: jest.fn() };

    const avisos = avisarCredenciaisSociaisAusentes(
        {
            NODE_ENV: 'production',
            APPLE_CLIENT_ID: 'com.amauc.conecta.legado',
        },
        logger
    );

    expect(avisos).toEqual(expect.arrayContaining([
        expect.objectContaining({
            provedor: 'APPLE',
            ausentes: ['APPLE_IOS_CLIENT_ID', 'APPLE_SERVICES_ID'],
        }),
    ]));
});
