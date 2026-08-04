const crypto = require('crypto');
const store = require('../../src/services/passwordTokenStore');

describe('passwordTokenStore', () => {
    afterEach(() => {
        delete process.env.NODE_ENV;
    });

    test('gera token aleatorio e hash estavel sem guardar o valor puro', () => {
        const token = store.gerarTokenSeguro();
        const hash = store.hashToken(token);

        expect(token).toHaveLength(43);
        expect(hash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
        expect(hash).not.toBe(token);
    });

    test('identifica ambiente, calcula expiracao e remove somente tokens vencidos', () => {
        process.env.NODE_ENV = 'development';
        expect(store.ambienteDesenvolvimento()).toBe(true);
        process.env.NODE_ENV = 'production';
        expect(store.ambienteDesenvolvimento()).toBe(false);

        const agora = Date.now();
        expect(store.expiraEmMinutos(2).getTime())
            .toBeGreaterThanOrEqual(agora + 119_000);
    });
});
