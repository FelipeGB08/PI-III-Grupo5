jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../../src/models/AvaliacaoModel', () => ({
    buscarPorServico: jest.fn(),
    buscarPorProfissional: jest.fn(),
    calcularMedia: jest.fn(),
    criar: jest.fn(),
    criarParaCliente: jest.fn(),
    buscarAvaliacaoClientePorServico: jest.fn(),
    buscarDoClientePrivado: jest.fn(),
}));

jest.mock('../../src/models/ServicoModel', () => ({
    buscarPorId: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

jest.mock('../../src/services/conclusaoService', () => ({
    confirmarConclusoesExpiradas: jest.fn(),
}));

const AvaliacaoModel = require('../../src/models/AvaliacaoModel');
const ServicoModel = require('../../src/models/ServicoModel');
const { notificarUsuarioSemBloquear } = require('../../src/services/notificationService');
const {
    confirmarConclusoesExpiradas,
} = require('../../src/services/conclusaoService');
const AvaliacaoController = require('../../src/controllers/AvaliacaoController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('AvaliacaoController', () => {
    beforeEach(() => {
        confirmarConclusoesExpiradas.mockResolvedValue([]);
    });

    test('bloqueia avaliacao duplicada do mesmo chamado', async () => {
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 9,
            status: 'concluido',
        });
        AvaliacaoModel.buscarPorServico.mockResolvedValue({ id: 77, servico_id: 44 });
        const req = {
            usuarioLogado: { id: 12 },
            body: { servico_id: 44, nota_estrelas: 5 },
        };
        const res = criarRespostaMock();

        await AvaliacaoController.criarAvaliacao(req, res);

        expect(AvaliacaoModel.buscarPorServico).toHaveBeenCalledWith(44);
        expect(AvaliacaoModel.criar).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ erro: expect.stringContaining('avaliado') })
        );
    });

    test('registra a primeira avaliacao de um chamado concluido', async () => {
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 9,
            status: 'concluido',
        });
        AvaliacaoModel.buscarPorServico.mockResolvedValue(null);
        AvaliacaoModel.criar.mockResolvedValue({ id: 77, servico_id: 44 });
        const req = {
            usuarioLogado: { id: 12 },
            body: { servico_id: 44, nota_estrelas: 5, comentario: 'Excelente' },
        };
        const res = criarRespostaMock();

        await AvaliacaoController.criarAvaliacao(req, res);

        expect(AvaliacaoModel.criar).toHaveBeenCalledWith(44, 5, 'Excelente');
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'avaliacao_recebida',
            })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('bloqueia avaliacao enquanto aguarda confirmacao do cliente', async () => {
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 9,
            status: 'aguardando_confirmacao_cliente',
        });
        const res = criarRespostaMock();

        await AvaliacaoController.criarAvaliacao(
            {
                usuarioLogado: { id: 12 },
                body: { servico_id: 44, nota_estrelas: 5 },
            },
            res
        );

        expect(confirmarConclusoesExpiradas).toHaveBeenCalledWith({
            servicoId: 44,
        });
        expect(AvaliacaoModel.criar).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            erro: expect.stringContaining('status "concluido"'),
        }));
    });

    test('lista pagina de avaliacoes do profissional com total', async () => {
        const avaliacoesDoModel = [{
            id: 77,
            servico_id: 44,
            nota_estrelas: 5,
            comentario: 'Excelente',
            cidadao_nome: 'Nome privado',
            servico_descricao: 'Endereco e detalhes privados do chamado',
            email: 'privado@exemplo.com',
            telefone: '(49) 99999-9999',
        }];
        AvaliacaoModel.buscarPorProfissional.mockResolvedValue({
            items: avaliacoesDoModel,
            total: 21,
            page: 2,
            pageSize: 10,
            totalPages: 3,
            hasMore: true,
        });
        AvaliacaoModel.calcularMedia.mockResolvedValue('4.8');
        const res = criarRespostaMock();

        await AvaliacaoController.listarDoProfissional(
            {
                params: { id: '9' },
                validated: { query: { page: 2, pageSize: 10 } },
            },
            res
        );

        expect(AvaliacaoModel.buscarPorProfissional).toHaveBeenCalledWith('9', {
            page: 2,
            pageSize: 10,
        });
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                media: 4.8,
                avaliacoes: [{
                    id: 77,
                    servico_id: 44,
                    nota_estrelas: 5,
                    comentario: 'Excelente',
                }],
                total: 21,
                hasMore: true,
                paginacao: expect.objectContaining({ totalPages: 3 }),
            })
        );
        const resposta = res.json.mock.calls[0][0];
        expect(JSON.stringify(resposta)).not.toMatch(
            /cidadao_nome|servico_descricao|email|telefone/
        );
    });

    test('permite que o profissional avalie o cliente uma vez apos conclusao', async () => {
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 9,
            status: 'concluido',
        });
        AvaliacaoModel.buscarAvaliacaoClientePorServico.mockResolvedValue(null);
        AvaliacaoModel.criarParaCliente.mockResolvedValue({
            id: 78,
            servico_id: 44,
            nota_estrelas: 5,
        });
        const res = criarRespostaMock();

        await AvaliacaoController.criarAvaliacaoCliente({
            usuarioLogado: { id: 9 },
            body: {
                servico_id: 44,
                nota_estrelas: 5,
                comentario: 'Cliente cumpriu o combinado.',
            },
        }, res);

        expect(AvaliacaoModel.criarParaCliente).toHaveBeenCalledWith(
            44,
            5,
            'Cliente cumpriu o combinado.'
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('nao permite que o profissional avalie cliente de outro servico', async () => {
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 10,
            status: 'concluido',
        });
        const res = criarRespostaMock();

        await AvaliacaoController.criarAvaliacaoCliente({
            usuarioLogado: { id: 9 },
            body: { servico_id: 44, nota_estrelas: 5 },
        }, res);

        expect(AvaliacaoModel.criarParaCliente).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
