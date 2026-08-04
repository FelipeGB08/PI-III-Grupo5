jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
}));

const pool = require('../../src/config/db');
const { limparDadosSimulacao } = require('../../scripts/seed');

describe('seed', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pool.query.mockResolvedValue({ rows: [] });
    });

    test('limpa dados de simulacao com comandos parametrizados separados', async () => {
        await limparDadosSimulacao();

        expect(pool.query).toHaveBeenCalledTimes(7);
        for (const [, valores] of pool.query.mock.calls) {
            expect(valores).toHaveLength(1);
            expect(valores[0]).toEqual(expect.arrayContaining([
                'ana.contratante@amauc.com',
                'admin@amauc.com',
                'ricardo.ti@amauc.com',
            ]));
        }
    });
});
