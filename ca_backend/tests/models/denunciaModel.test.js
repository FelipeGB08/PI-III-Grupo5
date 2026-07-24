jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const DenunciaModel = require('../../src/models/DenunciaModel');

describe('DenunciaModel', () => {
    beforeEach(() => jest.clearAllMocks());

    test('insere denuncia por SELECT restrito ao participante do chamado', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 7 }] });

        await DenunciaModel.criar({
            servicoSolicitadoId: 44,
            denuncianteId: 12,
            motivo: 'outro',
            descricao: 'Descricao suficientemente detalhada.',
        });

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain('cidadao_id = $2 OR prof_id = $2');
        expect(sql).toContain('INSERT INTO denuncias');
        expect(valores).toEqual([44, 12, 'outro', 'Descricao suficientemente detalhada.']);
    });

    test('filtra a fila administrativa pelo status quando informado', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await DenunciaModel.listarParaAdmin('em_analise');

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain('WHERE d.status = $1');
        expect(valores).toEqual(['em_analise']);
    });

    test('detalhe administrativo inclui contexto historico do chamado', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await DenunciaModel.buscarDetalheParaAdmin(7);

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain("'motivo_remarcacao'");
        expect(sql).toContain("'conclusao_confirmada_em'");
        expect(sql).toContain("'fotos_conclusao'");
        expect(sql).toContain("'cliente'");
        expect(valores).toEqual([7]);
    });

    test('resolucao registra o admin e retorna o status anterior', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 7 }] });

        await DenunciaModel.atualizarPorAdmin({
            denunciaId: 7,
            adminId: 1,
            status: 'resolvida',
            resolucaoAdmin: 'Caso encerrado.',
        });

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain('FOR UPDATE');
        expect(sql).toContain('anterior.status AS status_anterior');
        expect(sql).toContain('resolvido_por');
        expect(valores).toEqual([7, 'resolvida', 'Caso encerrado.', 1]);
    });
});
