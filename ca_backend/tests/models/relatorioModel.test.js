jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const RelatorioModel = require('../../src/models/RelatorioModel');

describe('RelatorioModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('consolida indicadores operacionais, de verificacao e moderacao', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ municipio: 'Concordia', total_demandas: '4' }] })
            .mockResolvedValueOnce({ rows: [{ status: 'aceito', quantidade: '3' }] })
            .mockResolvedValueOnce({ rows: [{ profissional_id: 9, nota_media: '5.00', total_avaliacoes: 2 }] })
            .mockResolvedValueOnce({ rows: [{ categoria_id: 1, categoria: 'Eletricista', total_chamados: 4 }] })
            .mockResolvedValueOnce({ rows: [{ profissional_id: 9, taxa_cancelamento: '25.00' }] })
            .mockResolvedValueOnce({ rows: [{ total: '2' }] })
            .mockResolvedValueOnce({ rows: [{ total: '1' }] });

        const resultado = await RelatorioModel.obterEstatisticas();

        expect(pool.query).toHaveBeenCalledTimes(7);
        expect(pool.query.mock.calls[2][0]).toContain('AVG(a.nota_estrelas)');
        expect(pool.query.mock.calls[3][0]).toContain('COUNT(DISTINCT s.id)');
        expect(pool.query.mock.calls[4][0]).toContain("s.status = 'cancelado_cliente'");
        expect(pool.query.mock.calls[5][0]).toContain("status_verificacao = 'pendente'");
        expect(pool.query.mock.calls[6][0]).toContain("status = 'aberta'");
        expect(resultado).toEqual(expect.objectContaining({
            prestadores_mais_bem_avaliados: [expect.objectContaining({ profissional_id: 9 })],
            chamados_por_categoria: [expect.objectContaining({ categoria: 'Eletricista' })],
            taxa_cancelamento_por_prestador: [expect.objectContaining({ profissional_id: 9 })],
            verificacoes_pendentes: 2,
            denuncias_abertas: 1,
        }));
    });
});
