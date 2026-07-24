const crypto = require('crypto');
const store = require('../../src/services/passwordTokenStore');

describe('passwordTokenStore', () => {
    afterEach(() => {
        store.magicLinkTokens.clear();
        store.passwordResetTokens.clear();
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
        expect(store.expiraEmMinutos(2)).toBeGreaterThanOrEqual(agora + 119_000);

        const tokens = new Map([
            ['vencido', { expiraEm: agora - 1 }],
            ['valido', { expiraEm: agora + 60_000 }],
        ]);
        store.limparExpirados(tokens);
        expect([...tokens.keys()]).toEqual(['valido']);
    });
});
