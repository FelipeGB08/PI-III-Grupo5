jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const PerfilModel = require('../../src/models/PerfilModel');

describe('PerfilModel - verificacao profissional', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('envio marca a verificacao como pendente e remove selo anterior', async () => {
        pool.query.mockResolvedValue({ rows: [{ perfil_id: 8 }] });

        await PerfilModel.enviarDocumentoVerificacao(12, 'verificacoes/documento.jpg');

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain("status_verificacao = 'pendente'");
        expect(sql).toContain('verificado = FALSE');
        expect(sql).toContain('revisado_por = NULL');
        expect(valores).toEqual([12, 'verificacoes/documento.jpg']);
    });

    test('aprovacao exige pendencia e habilita somente o selo publico', async () => {
        pool.query.mockResolvedValue({ rows: [{ perfil_id: 8 }] });

        await PerfilModel.aprovarVerificacao(8, 1);

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain("status_verificacao = 'aprovado'");
        expect(sql).toContain('verificado = TRUE');
        expect(sql).toContain("AND status_verificacao = 'pendente'");
        expect(sql).not.toContain('documento_url');
        expect(valores).toEqual([8, 1]);
    });

    test('lista administrativa pendente nao seleciona documento privado', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await PerfilModel.listarVerificacoesPendentes();

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain("WHERE pp.status_verificacao = 'pendente'");
        expect(sql).not.toContain('documento_url');
    });
});
