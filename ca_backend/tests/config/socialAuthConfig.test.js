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

test('avisa quando o client ID Google nao esta configurado em producao', () => {
    const logger = { warn: jest.fn() };
    const avisos = avisarCredenciaisSociaisAusentes(
        { NODE_ENV: 'production' },
        logger
    );

    expect(avisos).toEqual([
        { provedor: 'GOOGLE', ausentes: ['GOOGLE_CLIENT_ID'] },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('GOOGLE_CLIENT_ID')
    );
});

test('considera o valor do env example como placeholder', () => {
    const logger = { warn: jest.fn() };
    const avisos = avisarCredenciaisSociaisAusentes(
        {
            NODE_ENV: 'production',
            GOOGLE_CLIENT_ID: 'seu_google_oauth_client_id',
        },
        logger
    );

    expect(avisos).toHaveLength(1);
});

test('nao avisa quando o client ID Google foi configurado', () => {
    const logger = { warn: jest.fn() };
    const avisos = avisarCredenciaisSociaisAusentes(
        {
            NODE_ENV: 'production',
            GOOGLE_CLIENT_ID: 'web-client.apps.googleusercontent.com',
        },
        logger
    );

    expect(avisos).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
});
