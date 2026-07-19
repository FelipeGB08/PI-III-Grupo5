describe('configuracao do Sentry', () => {
    const dsnOriginal = process.env.SENTRY_DSN;
    const ambienteOriginal = process.env.SENTRY_ENVIRONMENT;

    afterEach(() => {
        jest.resetModules();
        jest.dontMock('@sentry/node');
        if (dsnOriginal === undefined) delete process.env.SENTRY_DSN;
        else process.env.SENTRY_DSN = dsnOriginal;
        if (ambienteOriginal === undefined) delete process.env.SENTRY_ENVIRONMENT;
        else process.env.SENTRY_ENVIRONMENT = ambienteOriginal;
    });

    test('mantem o monitoramento desativado quando SENTRY_DSN nao foi configurado', () => {
        delete process.env.SENTRY_DSN;
        const init = jest.fn();
        jest.doMock('@sentry/node', () => ({ init }));

        let configuracao;
        jest.isolateModules(() => {
            configuracao = require('../../src/config/sentry');
        });

        expect(configuracao.sentryAtivo).toBe(false);
        expect(init).not.toHaveBeenCalled();
    });

    test('inicializa o Sentry com DSN e ambiente configurados', () => {
        process.env.SENTRY_DSN = 'https://chave@o0.ingest.sentry.io/1';
        process.env.SENTRY_ENVIRONMENT = 'production';
        const init = jest.fn();
        jest.doMock('@sentry/node', () => ({ init }));

        let configuracao;
        jest.isolateModules(() => {
            configuracao = require('../../src/config/sentry');
        });

        expect(configuracao.sentryAtivo).toBe(true);
        expect(init).toHaveBeenCalledWith(expect.objectContaining({
            dsn: process.env.SENTRY_DSN,
            environment: 'production',
            sendDefaultPii: false,
        }));
    });
});
