jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const AvaliacaoModel = require('../../src/models/AvaliacaoModel');
const FavoritoModel = require('../../src/models/FavoritoModel');
const ServicoModel = require('../../src/models/ServicoModel');

describe('paginacao dos models', () => {
    test('pagina solicitacoes do cidadao com filtro e total', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 25 }] })
            .mockResolvedValueOnce({ rows: [{ id: 44 }] });

        const resultado = await ServicoModel.buscarPorCidadao(
            12,
            'concluido',
            { page: 2, pageSize: 10 }
        );

        expect(pool.query.mock.calls[0][0]).toContain('COUNT(*)');
        expect(pool.query.mock.calls[0][1]).toEqual([12, 'concluido']);
        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $3 OFFSET $4');
        expect(pool.query.mock.calls[1][1]).toEqual([
            12,
            'concluido',
            10,
            10,
        ]);
        expect(resultado).toEqual({
            items: [{ id: 44 }],
            total: 25,
            page: 2,
            pageSize: 10,
            totalPages: 3,
            hasMore: true,
        });
    });

    test('pagina solicitacoes do profissional com valores padrao', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 1 }] })
            .mockResolvedValueOnce({ rows: [{ id: 44 }] });

        const resultado = await ServicoModel.buscarPorProfissional(9);

        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
        expect(pool.query.mock.calls[1][1]).toEqual([9, 20, 0]);
        expect(resultado.hasMore).toBe(false);
        expect(resultado.total).toBe(1);
    });

    test('pagina historico de avaliacoes do profissional', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 41 }] })
            .mockResolvedValueOnce({ rows: [{ id: 77 }] });

        const resultado = await AvaliacaoModel.buscarPorProfissional(9, {
            page: 3,
            pageSize: 20,
        });

        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
        expect(pool.query.mock.calls[1][1]).toEqual([9, 20, 40]);
        expect(resultado.totalPages).toBe(3);
        expect(resultado.hasMore).toBe(false);
    });

    test('pagina favoritos e mantem total independente da pagina', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 22 }] })
            .mockResolvedValueOnce({
                rows: [{ id: 9, cidade_amauc: 'Concordia' }],
            });

        const resultado = await FavoritoModel.listar({
            usuarioId: 12,
            page: 2,
            pageSize: 20,
        });

        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
        expect(pool.query.mock.calls[1][1]).toEqual([12, 20, 20]);
        expect(resultado.items).toHaveLength(1);
        expect(resultado.total).toBe(22);
        expect(resultado.hasMore).toBe(false);
    });
});
