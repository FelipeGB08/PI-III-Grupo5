jest.mock('../../src/models/RelatorioModel', () => ({
    obterEstatisticas: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
}));

const RelatorioModel = require('../../src/models/RelatorioModel');
const RelatorioController = require('../../src/controllers/RelatorioController');
const { cadastroSchema } = require('../../src/validators/authSchemas');
const { criarSolicitacaoSchema } = require('../../src/validators/solicitacaoSchemas');
const { validarSenha } = require('../../src/utils/passwordPolicy');

function responseMock() {
    const res = {};
    res.set = jest.fn().mockReturnValue(res);
    res.attachment = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('remediacoes de seguranca', () => {
    test('rejeita foto externa e campos desconhecidos na solicitacao', () => {
        const base = {
            profissional_id: 9,
            agenda_servico_id: 2,
            descricao: 'Servico residencial',
            endereco_atendimento: 'Rua de teste',
            agendado_para: '2030-01-02T17:30:00.000Z',
        };
        expect(criarSolicitacaoSchema.safeParse({
            ...base,
            foto_url: 'https://externo.test/captura',
        }).success).toBe(false);
        expect(criarSolicitacaoSchema.safeParse({
            ...base,
            campo_inesperado: true,
        }).success).toBe(false);
        expect(criarSolicitacaoSchema.safeParse({
            ...base,
            foto_url: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
        }).success).toBe(true);
    });

    test('aplica politica de senha por tamanho e bytes', () => {
        expect(validarSenha('curta')).toMatch(/pelo menos/);
        expect(validarSenha('SenhaForte123')).toBeNull();
        expect(validarSenha('á'.repeat(40))).toMatch(/bytes/);
        expect(cadastroSchema.safeParse({
            nome: 'Ana',
            email: 'ana@example.test',
            senha: 'curta',
            cidade_amauc: 'Concordia',
            perfil_tipo: 'cidadao',
        }).success).toBe(false);
    });

    test('neutraliza formulas em todas as secoes CSV', async () => {
        RelatorioModel.obterEstatisticas.mockResolvedValue({
            resumo_status: [{ status: '=2+2', quantidade: 1 }],
            demandas_por_municipio: [],
            prestadores_mais_bem_avaliados: [],
            chamados_por_categoria: [],
            taxa_cancelamento_por_prestador: [],
            verificacoes_pendentes: 0,
            denuncias_abertas: 0,
        });
        const res = responseMock();
        await RelatorioController.exportarCsv({
            usuarioLogado: { perfil_tipo: 'admin' },
        }, res);
        const csv = res.send.mock.calls[0][0];
        expect(csv).toContain('"\'=2+2"');
        expect(csv).not.toContain('\r\n"=2+2"');
    });
});
