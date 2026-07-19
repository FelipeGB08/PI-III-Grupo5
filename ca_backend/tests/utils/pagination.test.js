const {
    criarMetadadosPaginacao,
    normalizarPaginacao,
    parsePagination,
    setPaginationHeaders,
} = require('../../src/utils/pagination');

describe('utilitarios de paginacao', () => {
    test('normaliza page/pageSize e limita o tamanho maximo', () => {
        expect(normalizarPaginacao({ page: '3', pageSize: '250' })).toEqual({
            page: 3,
            pageSize: 100,
            limit: 100,
            offset: 200,
        });
    });

    test('cria metadados inclusive para resultado vazio', () => {
        expect(
            criarMetadadosPaginacao({ total: 0, page: 1, pageSize: 20 })
        ).toEqual({
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
            hasMore: false,
        });
    });

    test('preserva paginacao legada usada pela busca de profissionais', () => {
        expect(parsePagination({ pagina: '2', tamanho: '80' })).toEqual({
            page: 2,
            limit: 50,
            offset: 50,
        });
    });

    test('preserva headers de paginacao dos endpoints existentes', () => {
        const res = { setHeader: jest.fn() };

        setPaginationHeaders(res, { total: 41, page: 2, limit: 20 });

        expect(res.setHeader.mock.calls).toEqual([
            ['X-Total-Count', '41'],
            ['X-Page', '2'],
            ['X-Limit', '20'],
            ['X-Total-Pages', '3'],
        ]);
    });
});
