jest.mock('../../src/config/sentry', () => ({
    sentryAtivo: true,
    Sentry: {
        withScope: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
    },
}));

const { Sentry } = require('../../src/config/sentry');
const logger = require('../../src/utils/logger');

describe('logger estruturado', () => {
    beforeEach(() => {
        Sentry.withScope.mockImplementation((callback) => callback({
            setLevel: jest.fn(),
            setContext: jest.fn(),
            setUser: jest.fn(),
        }));
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('registra erros em JSON e captura a excecao no Sentry', () => {
        const erro = new Error('Falha de teste');

        logger.error('Falha ao processar operacao.', {
            erro,
            componente: 'teste',
            usuarioId: 9,
        });

        const evento = JSON.parse(console.error.mock.calls[0][0]);
        expect(evento).toEqual(expect.objectContaining({
            nivel: 'error',
            mensagem: 'Falha ao processar operacao.',
            componente: 'teste',
            usuarioId: 9,
            erro: expect.objectContaining({ mensagem: 'Falha de teste' }),
        }));
        expect(Sentry.captureException).toHaveBeenCalledWith(erro);
    });

    test('mantem avisos estruturados locais sem criar evento de erro', () => {
        logger.warn('Configuracao incompleta.', { componente: 'teste' });

        const evento = JSON.parse(console.warn.mock.calls[0][0]);
        expect(evento.nivel).toBe('warn');
        expect(Sentry.captureMessage).not.toHaveBeenCalled();
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });
});
