jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const { criarPostgresRateLimitStore, hashKey } = require('../../src/services/rateLimitStore');

describe('rateLimitStore compartilhado', () => {
    const nodeEnvOriginal = process.env.NODE_ENV;
    beforeEach(() => jest.clearAllMocks());
    afterEach(() => {
        process.env.NODE_ENV = nodeEnvOriginal;
    });

    test('usa hash da chave e incremento atomico no PostgreSQL', async () => {
        pool.query.mockResolvedValue({
            rows: [{ contador: 2, reset_em: new Date(Date.now() + 60_000) }],
        });
        const store = criarPostgresRateLimitStore();
        const resultado = await store.consumir({
            chave: 'ip:rota:identidade',
            windowMs: 60_000,
        });

        expect(resultado.count).toBe(2);
        expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT (chave_hash)');
        expect(pool.query.mock.calls[0][1][0]).toBe(hashKey('ip:rota:identidade'));
        expect(pool.query.mock.calls[0][1][0]).not.toContain('identidade');
    });

    test('permite limpar buckets somente durante testes', async () => {
        pool.query.mockResolvedValue({});
        const store = criarPostgresRateLimitStore();
        process.env.NODE_ENV = 'development';
        await store.resetar();
        expect(pool.query).not.toHaveBeenCalled();

        process.env.NODE_ENV = 'test';
        await store.resetar();
        expect(pool.query).toHaveBeenCalledWith('DELETE FROM rate_limit_buckets');
    });

    test('estorna somente a tentativa que terminou em erro', async () => {
        pool.query.mockResolvedValue({});
        const store = criarPostgresRateLimitStore();

        await store.estornar({ chave: 'usuario:9' });

        expect(pool.query.mock.calls[0][0]).toContain('GREATEST(contador - 1, 0)');
        expect(pool.query.mock.calls[0][1]).toEqual([hashKey('usuario:9')]);
    });
});
