jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
}));

const pool = require('../../src/config/db');
const { limparDadosSimulacao, seed } = require('../../scripts/seed');

describe('seguranca do seed', () => {
    const envOriginal = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...envOriginal };
    });

    afterAll(() => {
        process.env = envOriginal;
    });

    test('recusa sempre em producao antes de conectar', async () => {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DESTRUCTIVE_SEED = 'true';
        process.env.DB_NAME = 'teste';
        process.env.SEED_DATABASE_ALLOWLIST = 'teste';

        await expect(seed()).rejects.toThrow(/nunca e permitido em producao/);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test('recusa sem confirmacao e allowlist explicitas', async () => {
        process.env.NODE_ENV = 'development';
        process.env.DB_NAME = 'conecta_amauc';
        delete process.env.ALLOW_DESTRUCTIVE_SEED;
        delete process.env.SEED_DATABASE_ALLOWLIST;

        await expect(seed()).rejects.toThrow(/ALLOW_DESTRUCTIVE_SEED/);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test('limpeza usa somente a lista exata de contas sinteticas', async () => {
        pool.query.mockResolvedValue({});
        await limparDadosSimulacao();

        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toContain('email = ANY($1::text[])');
        expect(sql).not.toContain('DELETE FROM avaliacoes;');
        expect(params[0]).toContain('admin@amauc.com');
        expect(params[0].every((email) => email.endsWith('@amauc.com'))).toBe(true);
    });
});
