jest.mock('../../src/config/sentry', () => ({
    Sentry: {},
    sentryAtivo: false,
}));

describe('redacao do logger', () => {
    test('nunca serializa credenciais ou dados pessoais conhecidos', () => {
        const info = jest.spyOn(console, 'info').mockImplementation(() => {});
        const logger = require('../../src/utils/logger');

        logger.info('evento', {
            token: 'valor-token-secreto',
            senha: 'valor-senha-secreto',
            authorization: 'Bearer segredo',
            endereco: 'Rua privada',
            latitude: -27.1,
            aninhado: { refresh_token: 'refresh-secreto', seguro: 'ok' },
        });

        const saida = info.mock.calls[0][0];
        expect(saida).not.toContain('valor-token-secreto');
        expect(saida).not.toContain('valor-senha-secreto');
        expect(saida).not.toContain('refresh-secreto');
        expect(saida).not.toContain('Rua privada');
        expect(saida).toContain('[REDACTED]');
        expect(saida).toContain('"seguro":"ok"');
        info.mockRestore();
    });
});
