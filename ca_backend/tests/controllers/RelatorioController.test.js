jest.mock('../../src/models/RelatorioModel', () => ({
    obterEstatisticas: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
}));

const RelatorioModel = require('../../src/models/RelatorioModel');
const RelatorioController = require('../../src/controllers/RelatorioController');
const { criarRespostaMock } = require('../helpers/httpMocks');

function criarRespostaCsvMock() {
    const res = criarRespostaMock();
    res.set = jest.fn().mockReturnValue(res);
    res.attachment = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

const estatisticas = {
    resumo_status: [{ status: 'aceito', quantidade: 3 }],
    demandas_por_municipio: [{ municipio: 'Concordia', total_demandas: 3 }],
    prestadores_mais_bem_avaliados: [{ profissional_id: 9, profissional_nome: 'Ana', nota_media: 5, total_avaliacoes: 2 }],
    chamados_por_categoria: [{ categoria_id: 1, categoria: 'Eletricista', total_chamados: 3 }],
    taxa_cancelamento_por_prestador: [{ profissional_id: 9, profissional_nome: 'Ana', total_chamados: 4, total_cancelados: 1, taxa_cancelamento: 25 }],
    verificacoes_pendentes: 2,
    denuncias_abertas: 1,
};

describe('RelatorioController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('admin consulta os novos indicadores administrativos', async () => {
        RelatorioModel.obterEstatisticas.mockResolvedValue(estatisticas);
        const res = criarRespostaMock();

        await RelatorioController.gerarRelatorio({
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            prestadores_mais_bem_avaliados: expect.any(Array),
            chamados_por_categoria: expect.any(Array),
            taxa_cancelamento_por_prestador: expect.any(Array),
            verificacoes_pendentes: 2,
            denuncias_abertas: 1,
        }));
    });

    test('usuario comum nao acessa indicadores ou exportacao', async () => {
        const relatorioRes = criarRespostaMock();
        const exportacaoRes = criarRespostaCsvMock();
        const req = { usuarioLogado: { id: 12, perfil_tipo: 'cidadao' } };

        await RelatorioController.gerarRelatorio(req, relatorioRes);
        await RelatorioController.exportarCsv(req, exportacaoRes);

        expect(RelatorioModel.obterEstatisticas).not.toHaveBeenCalled();
        expect(relatorioRes.status).toHaveBeenCalledWith(403);
        expect(exportacaoRes.status).toHaveBeenCalledWith(403);
    });

    test('admin exporta dados consolidados em CSV UTF-8', async () => {
        RelatorioModel.obterEstatisticas.mockResolvedValue(estatisticas);
        const res = criarRespostaCsvMock();

        await RelatorioController.exportarCsv({
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
            validated: { query: { formato: 'csv' } },
        }, res);

        expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
        expect(res.attachment).toHaveBeenCalledWith('relatorio-conecta-amauc.csv');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Prestadores mais bem avaliados'));
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"Ana"'));
    });
});
