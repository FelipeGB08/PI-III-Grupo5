jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../../src/models/ServicoModel', () => ({
    atualizarStatus: jest.fn(),
    adicionarFotosConclusao: jest.fn(),
    buscarPorId: jest.fn(),
    solicitarRemarcacao: jest.fn(),
    aceitarRemarcacao: jest.fn(),
    recusarRemarcacao: jest.fn(),
}));

jest.mock('../../src/models/UserModel', () => ({
    buscarPorId: jest.fn(),
}));

jest.mock('../../src/services/agendamentoValidator', () => ({
    validarAgendamento: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

const ServicoModel = require('../../src/models/ServicoModel');
const { validarAgendamento } = require('../../src/services/agendamentoValidator');
const { notificarUsuarioSemBloquear } = require('../../src/services/notificationService');
const SolicitacaoController = require('../../src/controllers/SolicitacaoController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('SolicitacaoController', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    test('aceita chamado do prestador e notifica o cliente', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'aceito',
        };
        ServicoModel.atualizarStatus.mockResolvedValue(solicitacao);
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            body: { status: 'aceito' },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(req, res);

        expect(ServicoModel.atualizarStatus).toHaveBeenCalledWith(44, 9, 'aceito');
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'chamado_aceito',
                payload: { solicitacao_id: 44, status: 'aceito' },
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('conclui chamado e dispara notificacao de avaliacao', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'concluido',
        };
        ServicoModel.atualizarStatus.mockResolvedValue(solicitacao);
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            body: { status: 'concluido' },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(req, res);

        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'chamado_concluido',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('impede alterar preco pelo endpoint generico de status', async () => {
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            body: { status: 'aceito', preco: 1 },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(ServicoModel.atualizarStatus).not.toHaveBeenCalled();
    });

    test('anexa evidencias antes de concluir o chamado', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            status: 'aceito',
            fotos_conclusao: ['/uploads/evidencia-1.jpg'],
        };
        ServicoModel.adicionarFotosConclusao.mockResolvedValue(solicitacao);
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            files: [
                { filename: 'evidencia-1.jpg' },
                { filename: 'evidencia-2.png' },
            ],
        };
        const res = criarRespostaMock();

        await SolicitacaoController.uploadFotosConclusao(req, res);

        expect(ServicoModel.adicionarFotosConclusao).toHaveBeenCalledWith(
            44,
            9,
            ['/uploads/evidencia-1.jpg', '/uploads/evidencia-2.png']
        );
        expect(res.status).toHaveBeenCalledWith(200);

        ServicoModel.atualizarStatus.mockResolvedValue({
            ...solicitacao,
            cidadao_id: 12,
            status: 'concluido',
        });
        const conclusaoReq = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            body: { status: 'concluido' },
        };
        const conclusaoRes = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(conclusaoReq, conclusaoRes);

        expect(
            ServicoModel.adicionarFotosConclusao.mock.invocationCallOrder[0]
        ).toBeLessThan(ServicoModel.atualizarStatus.mock.invocationCallOrder[0]);
        expect(conclusaoRes.status).toHaveBeenCalledWith(200);
    });

    test('exige ao menos uma evidencia quando o endpoint de fotos e usado', async () => {
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            files: [],
        };
        const res = criarRespostaMock();

        await SolicitacaoController.uploadFotosConclusao(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(ServicoModel.adicionarFotosConclusao).not.toHaveBeenCalled();
    });

    test('valida conflito e registra proposta de remarcacao', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2030-01-02T10:00:00'));

        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'aceito',
            agenda_servico_id: 19,
        });
        validarAgendamento.mockResolvedValue({
            agendado_para: '2030-01-03T14:30:00',
        });
        ServicoModel.solicitarRemarcacao.mockResolvedValue({
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'remarcacao_solicitada',
        });
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            body: {
                nova_data_hora: '2030-01-03T14:30:00',
                motivo: 'Conflito de agenda',
            },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.solicitarRemarcacao(req, res);

        expect(validarAgendamento).toHaveBeenCalledWith({
            profId: 9,
            agendaServicoId: 19,
            agendadoPara: '2030-01-03T14:30:00',
            ignorarSolicitacaoId: 44,
        });
        expect(ServicoModel.solicitarRemarcacao).toHaveBeenCalledWith(
            44,
            9,
            '2030-01-03T14:30:00',
            'Conflito de agenda'
        );
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'remarcacao_solicitada',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);

    });

    test('cliente aceita a remarcacao pendente', async () => {
        ServicoModel.aceitarRemarcacao.mockResolvedValue({
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'aceito',
        });
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 12 },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.aceitarRemarcacao(req, res);

        expect(ServicoModel.aceitarRemarcacao).toHaveBeenCalledWith(44, 12);
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'remarcacao_aceita',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('cliente recusa a remarcacao pendente e notifica o prestador', async () => {
        ServicoModel.recusarRemarcacao.mockResolvedValue({
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'aceito',
        });
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 12 },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.recusarRemarcacao(req, res);

        expect(ServicoModel.recusarRemarcacao).toHaveBeenCalledWith(44, 12);
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'remarcacao_recusada',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
