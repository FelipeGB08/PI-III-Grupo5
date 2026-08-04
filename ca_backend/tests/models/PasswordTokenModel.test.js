jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

const pool = require('../../src/config/db');
const PasswordTokenModel = require('../../src/models/PasswordTokenModel');

describe('PasswordTokenModel', () => {
    beforeEach(() => jest.clearAllMocks());

    test('consome um token somente uma vez mesmo sob chamadas concorrentes', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ usuario_id: 7 }] })
            .mockResolvedValueOnce({ rows: [] });

        const resultados = await Promise.all([
            PasswordTokenModel.consumir({
                tokenHash: 'a'.repeat(64),
                finalidade: 'magic_link',
            }),
            PasswordTokenModel.consumir({
                tokenHash: 'a'.repeat(64),
                finalidade: 'magic_link',
            }),
        ]);

        expect(resultados.filter(Boolean)).toHaveLength(1);
        expect(pool.query.mock.calls[0][0]).toContain('consumido_em IS NULL');
    });

    test('troca senha e revoga todas as sessoes na mesma transacao', async () => {
        const client = {
            query: jest.fn()
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rows: [{ usuario_id: 7 }] })
                .mockResolvedValueOnce({ rows: [{ id: 7 }] })
                .mockResolvedValueOnce({ rowCount: 2 })
                .mockResolvedValueOnce({}),
            release: jest.fn(),
        };
        pool.connect.mockResolvedValue(client);

        const usuario = await PasswordTokenModel.consumirResetEAtualizarSenha({
            tokenHash: 'b'.repeat(64),
            senhaHash: 'hash-seguro',
        });

        expect(usuario).toEqual({ id: 7 });
        expect(client.query.mock.calls.map((call) => call[0])).toEqual(
            expect.arrayContaining([
                'BEGIN',
                expect.stringContaining('UPDATE refresh_tokens'),
                'COMMIT',
            ])
        );
        expect(client.release).toHaveBeenCalled();
    });
});
