jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const {
    PRAZO_CONFIRMACAO_HORAS,
    confirmarConclusoesExpiradas,
} = require('../../src/services/conclusaoService');

describe('conclusaoService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('confirma automaticamente chamados pendentes ha pelo menos 72 horas', async () => {
        pool.query.mockResolvedValue({
            rows: [{
                id: 44,
                status: 'concluido',
                conclusao_confirmada_automaticamente: true,
            }],
        });

        const resultado = await confirmarConclusoesExpiradas();

        expect(PRAZO_CONFIRMACAO_HORAS).toBe(72);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining("INTERVAL '72 hours'"),
            []
        );
        expect(pool.query.mock.calls[0][0]).toContain(
            "status = 'aguardando_confirmacao_cliente'"
        );
        expect(pool.query.mock.calls[0][0]).toContain(
            'conclusao_confirmada_automaticamente = TRUE'
        );
        expect(resultado).toEqual([
            expect.objectContaining({ status: 'concluido' }),
        ]);
    });

    test('limita a confirmacao automatica ao chamado informado', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await confirmarConclusoesExpiradas({ servicoId: 44 });

        expect(pool.query.mock.calls[0][0]).toContain('AND id = $1');
        expect(pool.query.mock.calls[0][1]).toEqual([44]);
    });
});
