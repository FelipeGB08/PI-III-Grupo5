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
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('APPLE_CLIENT_ID'));
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
            APPLE_CLIENT_ID: 'com.amauc.conecta.service',
            GITHUB_CLIENT_ID: 'Iv1.exemplo',
            GITHUB_CLIENT_SECRET: 'segredo-real-fora-do-repositorio',
        },
        logger
    );

    expect(avisos).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
});
