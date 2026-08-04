jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../../src/models/ServicoModel', () => ({
    criar: jest.fn(),
    atualizarStatus: jest.fn(),
    marcarConclusaoPeloPrestador: jest.fn(),
    confirmarConclusaoPeloCliente: jest.fn(),
    adicionarFotosConclusao: jest.fn(),
    buscarPorId: jest.fn(),
    buscarDetalhadoPorId: jest.fn(),
    buscarPorCidadao: jest.fn(),
    buscarPorProfissional: jest.fn(),
    buscarFinanceiroUsuario: jest.fn(),
    proporValor: jest.fn(),
    aceitarPropostaValor: jest.fn(),
    recusarPropostaValor: jest.fn(),
    cancelarPeloCliente: jest.fn(),
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

jest.mock('../../src/services/conclusaoService', () => ({
    confirmarConclusoesExpiradas: jest.fn(),
}));

const ServicoModel = require('../../src/models/ServicoModel');
const UserModel = require('../../src/models/UserModel');
const { validarAgendamento } = require('../../src/services/agendamentoValidator');
const { notificarUsuarioSemBloquear } = require('../../src/services/notificationService');
const {
    confirmarConclusoesExpiradas,
} = require('../../src/services/conclusaoService');
const SolicitacaoController = require('../../src/controllers/SolicitacaoController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('SolicitacaoController', () => {
    beforeEach(() => {
        confirmarConclusoesExpiradas.mockResolvedValue([]);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('busca solicitacao detalhada para usuario autenticado', async () => {
        const solicitacao = { id: 44, cidadao_id: 12, prof_id: 9 };
        ServicoModel.buscarDetalhadoPorId.mockResolvedValue(solicitacao);
        const res = criarRespostaMock();

        await SolicitacaoController.buscarPorId(
            { params: { id: '44' }, usuario: { id: 12 } },
            res
        );

        expect(ServicoModel.buscarDetalhadoPorId).toHaveBeenCalledWith(44, 12);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            solicitacao,
            servico: solicitacao,
        });
    });

    test.each([
        [{ params: { id: '44' } }, 401, 'Usuario nao autenticado.'],
        [
            { params: { id: 'invalido' }, user: { id: 12 } },
            400,
            'ID da solicitacao invalido.',
        ],
    ])('valida busca por id antes de consultar o model', async (req, status, erro) => {
        const res = criarRespostaMock();

        await SolicitacaoController.buscarPorId(req, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith({ erro });
        expect(ServicoModel.buscarDetalhadoPorId).not.toHaveBeenCalled();
    });

    test('retorna 404 quando solicitacao detalhada nao existe', async () => {
        ServicoModel.buscarDetalhadoPorId.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.buscarPorId(
            { params: { id: '44' }, usuarioLogado: { id: 12 } },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('trata falha ao buscar solicitacao detalhada', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        ServicoModel.buscarDetalhadoPorId.mockRejectedValue(new Error('falha'));
        const res = criarRespostaMock();

        await SolicitacaoController.buscarPorId(
            { params: { id: '44' }, usuarioLogado: { id: 12 } },
            res
        );

        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('cria solicitacao com aliases de payload e notifica o prestador', async () => {
        UserModel.buscarPorId.mockResolvedValue({ id: 9, perfil_tipo: 'profissional' });
        validarAgendamento.mockResolvedValue({
            agenda_servico_id: 19,
            servico_nome: 'Eletricista',
            agendado_para: '2030-01-03T14:30:00',
            preco: 150,
            duracao_minutos: 60,
        });
        const solicitacao = {
            id: 44,
            prof_id: 9,
            status: 'pendente',
            servico_nome: 'Eletricista',
        };
        ServicoModel.criar.mockResolvedValue(solicitacao);
        const res = criarRespostaMock();
        const req = {
            usuario: { id: 12 },
            body: {
                profissional_id: '9',
                descricao: '  Trocar tomada  ',
                enderecoAtendimento: '  Rua Central  ',
                fotoUrl: '   ',
                agenda_servico_id: '19',
                agendadoPara: '2030-01-03T14:30:00',
                atendimentoLatitude: '-27.2335',
                atendimentoLongitude: '-52.0277',
                servico_nome: 'Nome enviado pelo cliente',
                preco: 1,
            },
        };

        await SolicitacaoController.criarSolicitacao(req, res);

        expect(ServicoModel.criar).toHaveBeenCalledWith(
            12,
            9,
            'Trocar tomada',
            null,
            {
                agenda_servico_id: 19,
                servico_nome: 'Eletricista',
                endereco_atendimento: 'Rua Central',
                atendimento_latitude: -27.2335,
                atendimento_longitude: -52.0277,
                agendado_para: '2030-01-03T14:30:00',
                preco: 150,
                duracao_minutos: 60,
            }
        );
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'novo_chamado',
            })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test.each([
        [
            { body: { prof_id: 9, descricao: null } },
            401,
            'Usuario nao autenticado.',
        ],
        [
            { user: { id: 9 }, body: { prestador_id: 9 } },
            400,
            'Voce nao pode criar uma solicitacao para si mesmo.',
        ],
    ])('bloqueia criacao invalida sem consultar agenda', async (req, status, erro) => {
        const res = criarRespostaMock();

        await SolicitacaoController.criarSolicitacao(req, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith({ erro });
        expect(validarAgendamento).not.toHaveBeenCalled();
    });

    test.each([
        [undefined],
        [{ id: 9, perfil_tipo: 'cidadao' }],
    ])('recusa criacao para usuario que nao e profissional (%p)', async (profissional) => {
        UserModel.buscarPorId.mockResolvedValue(profissional);
        const res = criarRespostaMock();

        await SolicitacaoController.criarSolicitacao(
            {
                usuarioLogado: { id: 12 },
                body: { prof_id: 9, descricao: 'Servico' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(validarAgendamento).not.toHaveBeenCalled();
    });

    test('preserva erro de negocio retornado pelo validador ao criar', async () => {
        UserModel.buscarPorId.mockResolvedValue({ id: 9, perfil_tipo: 'profissional' });
        validarAgendamento.mockRejectedValue(
            Object.assign(new Error('Horario indisponivel.'), { status: 400 })
        );
        const res = criarRespostaMock();

        await SolicitacaoController.criarSolicitacao(
            {
                usuarioLogado: { id: 12 },
                body: { prof_id: 9, descricao: 'Servico' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ erro: 'Horario indisponivel.' });
    });

    test.each([
        [
            'listarMeusPedidos',
            'buscarPorCidadao',
            {
                user: { id: 12 },
                validated: {
                    query: { status: 'pendente', page: 2, pageSize: 10 },
                },
            },
            'pedidos',
        ],
        [
            'listarMinhasSolicitacoes',
            'buscarPorProfissional',
            {
                usuario: { id: 9 },
                validated: { query: { page: 2, pageSize: 10 } },
            },
            'solicitacoes',
        ],
    ])('lista dados em %s', async (controller, model, req, chave) => {
        const registros = [{ id: 44 }];
        ServicoModel[model].mockResolvedValue({
            items: registros,
            total: 21,
            page: 2,
            pageSize: 10,
            totalPages: 3,
            hasMore: true,
        });
        const res = criarRespostaMock();

        await SolicitacaoController[controller](req, res);

        expect(ServicoModel[model]).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                [chave]: registros,
                total: 21,
                page: 2,
                pageSize: 10,
                hasMore: true,
                paginacao: expect.objectContaining({ totalPages: 3 }),
            })
        );
    });

    test.each(['listarMeusPedidos', 'listarMinhasSolicitacoes'])(
        '%s exige autenticacao',
        async (controller) => {
            const res = criarRespostaMock();

            await SolicitacaoController[controller]({ query: {} }, res);

            expect(res.status).toHaveBeenCalledWith(401);
        }
    );

    test('retorna resumo financeiro para perfil permitido', async () => {
        const financeiro = { perfil: 'prestador', resumo: {}, itens: [] };
        ServicoModel.buscarFinanceiroUsuario.mockResolvedValue(financeiro);
        const res = criarRespostaMock();

        await SolicitacaoController.buscarFinanceiro(
            {
                usuarioLogado: { id: 9, perfil_tipo: 'profissional' },
                query: { status: 'concluido' },
            },
            res
        );

        expect(ServicoModel.buscarFinanceiroUsuario).toHaveBeenCalledWith({
            usuarioId: 9,
            perfilTipo: 'profissional',
            status: 'concluido',
        });
        expect(res.json).toHaveBeenCalledWith(financeiro);
    });

    test.each([
        [{ query: {} }, 401],
        [{ usuarioLogado: { id: 9, perfil_tipo: 'visitante' }, query: {} }, 403],
    ])('protege consulta financeira (%#)', async (req, status) => {
        const res = criarRespostaMock();

        await SolicitacaoController.buscarFinanceiro(req, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(ServicoModel.buscarFinanceiroUsuario).not.toHaveBeenCalled();
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

    test('prestador solicita conclusao e aguarda confirmacao do cliente', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'aguardando_confirmacao_cliente',
            fotos_conclusao: ['/uploads/evidencia.jpg'],
        };
        ServicoModel.marcarConclusaoPeloPrestador.mockResolvedValue(solicitacao);
        const req = {
            params: { id: '44' },
            usuarioLogado: { id: 9 },
            body: { status: 'concluido' },
        };
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(req, res);

        expect(ServicoModel.marcarConclusaoPeloPrestador)
            .toHaveBeenCalledWith(44, 9);
        expect(ServicoModel.atualizarStatus).not.toHaveBeenCalled();
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'confirmacao_conclusao_pendente',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            solicitacao: expect.objectContaining({
                status: 'aguardando_confirmacao_cliente',
            }),
        }));
    });

    test('prestador nao conclui chamado aceito sem foto de evidencia', async () => {
        ServicoModel.marcarConclusaoPeloPrestador.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { status: 'concluido' },
            },
            res
        );

        expect(ServicoModel.marcarConclusaoPeloPrestador)
            .toHaveBeenCalledWith(44, 9);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'A conclusao exige um chamado aceito e ao menos uma foto de evidencia.',
        });
    });

    test('cliente confirma conclusao pendente e libera status concluido', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'concluido',
            conclusao_confirmada_automaticamente: false,
        };
        ServicoModel.confirmarConclusaoPeloCliente.mockResolvedValue(solicitacao);
        const res = criarRespostaMock();

        await SolicitacaoController.confirmarConclusao(
            {
                params: { id: '44' },
                usuarioLogado: { id: 12, perfil_tipo: 'cidadao' },
            },
            res
        );

        expect(ServicoModel.confirmarConclusaoPeloCliente)
            .toHaveBeenCalledWith(44, 12);
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'conclusao_confirmada_cliente',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            solicitacao: expect.objectContaining({ status: 'concluido' }),
        }));
    });

    test('retorna conclusao automatica quando prazo venceu antes do clique', async () => {
        confirmarConclusoesExpiradas.mockResolvedValueOnce([{
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'concluido',
            conclusao_confirmada_automaticamente: true,
        }]);
        const res = criarRespostaMock();

        await SolicitacaoController.confirmarConclusao(
            {
                params: { id: '44' },
                usuarioLogado: { id: 12 },
            },
            res
        );

        expect(ServicoModel.confirmarConclusaoPeloCliente).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            mensagem: expect.stringContaining('automaticamente'),
        }));
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
                { url: '/uploads/evidencia-1.jpg' },
                { url: '/uploads/evidencia-2.png' },
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

        ServicoModel.marcarConclusaoPeloPrestador.mockResolvedValue({
            ...solicitacao,
            cidadao_id: 12,
            status: 'aguardando_confirmacao_cliente',
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
        ).toBeLessThan(
            ServicoModel.marcarConclusaoPeloPrestador.mock.invocationCallOrder[0]
        );
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

    test.each([
        [{ params: { id: '44' }, body: { status: 'aceito' } }, 401],
        [
            {
                params: { id: 'invalido' },
                usuarioLogado: { id: 9 },
                body: { status: 'aceito' },
            },
            400,
        ],
        [
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: {},
            },
            400,
        ],
    ])('valida alteracao generica de status (%#)', async (req, status) => {
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(ServicoModel.atualizarStatus).not.toHaveBeenCalled();
    });

    test('impede aceitar chamado ja aceito por outro prestador', async () => {
        ServicoModel.atualizarStatus.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(
            {
                params: { id: '44' },
                usuarioLogado: { id: 99 },
                body: { status: 'aceito' },
            },
            res
        );

        expect(ServicoModel.atualizarStatus).toHaveBeenCalledWith(44, 99, 'aceito');
        expect(res.status).toHaveBeenCalledWith(404);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });

    test('nao notifica cliente para status sem evento configurado', async () => {
        ServicoModel.atualizarStatus.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 9,
            status: 'pendente',
        });
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { status: 'pendente' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });

    test('trata erro inesperado ao alterar status', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        ServicoModel.atualizarStatus.mockRejectedValue(new Error('falha'));
        const res = criarRespostaMock();

        await SolicitacaoController.atualizarStatus(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { status: 'aceito' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('prestador envia proposta de valor e cliente e notificado', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'proposta_valor',
        };
        ServicoModel.proporValor.mockResolvedValue(solicitacao);
        const res = criarRespostaMock();

        await SolicitacaoController.proporValor(
            {
                params: { id: '44' },
                user: { id: 9 },
                body: {
                    preco_proposto: '175.50',
                    motivo_proposta_valor: 'Material incluso',
                },
            },
            res
        );

        expect(ServicoModel.proporValor).toHaveBeenCalledWith(
            44,
            9,
            175.5,
            'Material incluso'
        );
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'proposta_valor',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test.each([
        [
            { params: { id: '44' }, body: { preco: 100 } },
            401,
            'Usuario nao autenticado.',
        ],
        [
            {
                params: { id: 'invalido' },
                usuarioLogado: { id: 9 },
                body: { preco: 100 },
            },
            400,
            'ID da solicitacao invalido.',
        ],
        [
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { preco: -1 },
            },
            400,
            'Informe um valor valido para a proposta.',
        ],
        [
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { preco: 'nao-numerico' },
            },
            400,
            'Informe um valor valido para a proposta.',
        ],
    ])('valida proposta de valor (%#)', async (req, status, erro) => {
        const res = criarRespostaMock();

        await SolicitacaoController.proporValor(req, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith({ erro });
        expect(ServicoModel.proporValor).not.toHaveBeenCalled();
    });

    test('retorna 404 se estado atual nao permite proposta de valor', async () => {
        ServicoModel.proporValor.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.proporValor(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { preco: 200 },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });

    test('cliente aceita proposta de valor', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'pendente',
            preco: 175.5,
        };
        ServicoModel.aceitarPropostaValor.mockResolvedValue(solicitacao);
        const res = criarRespostaMock();

        await SolicitacaoController.aceitarPropostaValor(
            { params: { id: '44' }, usuarioLogado: { id: 12 } },
            res
        );

        expect(ServicoModel.aceitarPropostaValor).toHaveBeenCalledWith(44, 12);
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'proposta_valor_aceita',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test.each([
        ['aceitarPropostaValor', 'aceitarPropostaValor'],
        ['recusarPropostaValor', 'recusarPropostaValor'],
    ])('retorna 404 ao %s quando proposta nao esta pendente', async (controller, model) => {
        ServicoModel[model].mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController[controller](
            { params: { id: '44' }, usuarioLogado: { id: 12 } },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });

    test('cliente recusa proposta de valor', async () => {
        const solicitacao = {
            id: 44,
            prof_id: 9,
            cidadao_id: 12,
            status: 'pendente',
        };
        ServicoModel.recusarPropostaValor.mockResolvedValue(solicitacao);
        const res = criarRespostaMock();

        await SolicitacaoController.recusarPropostaValor(
            { params: { id: '44' }, usuarioLogado: { id: 12 } },
            res
        );

        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 9,
                tipo: 'proposta_valor_recusada',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test.each(['aceitarPropostaValor', 'recusarPropostaValor'])(
        '%s rejeita id invalido',
        async (controller) => {
            const res = criarRespostaMock();

            await SolicitacaoController[controller](
                { params: { id: 'invalido' }, usuarioLogado: { id: 12 } },
                res
            );

            expect(res.status).toHaveBeenCalledWith(400);
        }
    );

    test.each([
        [null, 'sem_horario_agendado', 'reembolso_integral'],
        ['data-invalida', 'sem_horario_agendado', 'reembolso_integral'],
        ['2030-01-02T13:00:00', 'cancelamento_antecipado', 'reembolso_integral'],
        ['2030-01-02T11:30:00', 'cancelamento_tardio', 'reembolso_parcial'],
    ])(
        'aplica politica de cancelamento para horario %p',
        async (agendadoPara, politica, reembolso) => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2030-01-02T10:00:00'));
            ServicoModel.buscarPorId.mockResolvedValue({
                id: 44,
                cidadao_id: 12,
                prof_id: 9,
                status: 'aceito',
                agendado_para: agendadoPara,
            });
            const cancelada = {
                id: 44,
                cidadao_id: 12,
                prof_id: 9,
                status: 'cancelado_cliente',
            };
            ServicoModel.cancelarPeloCliente.mockResolvedValue(cancelada);
            const res = criarRespostaMock();

            await SolicitacaoController.cancelarPeloCliente(
                {
                    params: { id: '44' },
                    usuarioLogado: { id: 12 },
                    body: { motivo: 'Nao preciso mais' },
                },
                res
            );

            expect(ServicoModel.cancelarPeloCliente).toHaveBeenCalledWith(
                44,
                12,
                'Nao preciso mais',
                politica,
                reembolso
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    politica_cancelamento: politica,
                    reembolso_status: reembolso,
                })
            );
            expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
                expect.objectContaining({
                    usuarioId: 9,
                    tipo: 'chamado_cancelado',
                })
            );
        }
    );

    test.each([
        [undefined],
        [{ id: 44, cidadao_id: 77, status: 'aceito' }],
    ])('impede cancelar solicitacao inexistente ou de outro cliente (%p)', async (atual) => {
        ServicoModel.buscarPorId.mockResolvedValue(atual);
        const res = criarRespostaMock();

        await SolicitacaoController.cancelarPeloCliente(
            {
                params: { id: '44' },
                usuarioLogado: { id: 12 },
                body: {},
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(ServicoModel.cancelarPeloCliente).not.toHaveBeenCalled();
    });

    test('nao cancela chamado concluido', async () => {
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            cidadao_id: 12,
            prof_id: 9,
            status: 'concluido',
            agendado_para: '2030-01-03T10:00:00',
        });
        ServicoModel.cancelarPeloCliente.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.cancelarPeloCliente(
            {
                params: { id: '44' },
                usuarioLogado: { id: 12 },
                body: { motivo_cancelamento: 'Tarde demais' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });

    test('cancelamento rejeita id invalido', async () => {
        const res = criarRespostaMock();

        await SolicitacaoController.cancelarPeloCliente(
            {
                params: { id: 'invalido' },
                usuarioLogado: { id: 12 },
                body: {},
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test.each([
        [
            { params: { id: 'invalido' }, usuarioLogado: { id: 9 }, body: {} },
            'ID da solicitacao invalido.',
        ],
        [
            { params: { id: '44' }, usuarioLogado: { id: 9 }, body: {} },
            'Informe a nova data e horario para remarcacao.',
        ],
        [
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { nova_data_hora: 'data-invalida' },
            },
            'Data ou horario de remarcacao invalido.',
        ],
        [
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { nova_data_hora: '2029-12-31T10:00:00' },
            },
            'Nao e permitido remarcar para horario passado.',
        ],
    ])('valida dados para solicitar remarcacao (%#)', async (req, erro) => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2030-01-02T10:00:00'));
        const res = criarRespostaMock();

        await SolicitacaoController.solicitarRemarcacao(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ erro });
        expect(ServicoModel.buscarPorId).not.toHaveBeenCalled();
    });

    test.each([
        [undefined],
        [{ id: 44, prof_id: 77, status: 'aceito' }],
        [{ id: 44, prof_id: 9, status: 'concluido' }],
    ])('impede remarcar chamado inexistente, alheio ou concluido (%p)', async (atual) => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2030-01-02T10:00:00'));
        ServicoModel.buscarPorId.mockResolvedValue(atual);
        const res = criarRespostaMock();

        await SolicitacaoController.solicitarRemarcacao(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { nova_data_hora: '2030-01-03T14:30:00' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(validarAgendamento).not.toHaveBeenCalled();
        expect(ServicoModel.solicitarRemarcacao).not.toHaveBeenCalled();
    });

    test('retorna 404 se remarcacao perde a corrida de atualizacao', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2030-01-02T10:00:00'));
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            prof_id: 9,
            status: 'aceito',
            agenda_servico_id: 19,
        });
        validarAgendamento.mockResolvedValue({
            agendado_para: '2030-01-03T14:30:00',
        });
        ServicoModel.solicitarRemarcacao.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.solicitarRemarcacao(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { remarcacao_solicitada_para: '2030-01-03T14:30:00' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });

    test('trata conflito apontado durante remarcacao', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2030-01-02T10:00:00'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        ServicoModel.buscarPorId.mockResolvedValue({
            id: 44,
            prof_id: 9,
            status: 'pendente',
            agenda_servico_id: 19,
        });
        validarAgendamento.mockRejectedValue(new Error('Conflito'));
        const res = criarRespostaMock();

        await SolicitacaoController.solicitarRemarcacao(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                body: { agendado_para: '2030-01-03T14:30:00' },
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(500);
        expect(ServicoModel.solicitarRemarcacao).not.toHaveBeenCalled();
    });

    test.each([
        ['aceitarRemarcacao', 'aceitarRemarcacao'],
        ['recusarRemarcacao', 'recusarRemarcacao'],
    ])('resposta de remarcacao %s valida id e estado pendente', async (controller, model) => {
        const invalidoRes = criarRespostaMock();
        await SolicitacaoController[controller](
            { params: { id: 'invalido' }, usuarioLogado: { id: 12 } },
            invalidoRes
        );
        expect(invalidoRes.status).toHaveBeenCalledWith(400);

        ServicoModel[model].mockResolvedValue(undefined);
        const ausenteRes = criarRespostaMock();
        await SolicitacaoController[controller](
            { params: { id: '44' }, usuarioLogado: { id: 12 } },
            ausenteRes
        );
        expect(ausenteRes.status).toHaveBeenCalledWith(404);
    });

    test.each([
        [{ params: { id: '44' }, files: [] }, 401],
        [
            {
                params: { id: 'invalido' },
                usuarioLogado: { id: 9 },
                files: [{ url: '/uploads/foto.jpg' }],
            },
            400,
        ],
    ])('protege upload de evidencia (%#)', async (req, status) => {
        const res = criarRespostaMock();

        await SolicitacaoController.uploadFotosConclusao(req, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(ServicoModel.adicionarFotosConclusao).not.toHaveBeenCalled();
    });

    test('recusa evidencia para chamado inexistente ou em estado invalido', async () => {
        ServicoModel.adicionarFotosConclusao.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await SolicitacaoController.uploadFotosConclusao(
            {
                params: { id: '44' },
                usuarioLogado: { id: 9 },
                files: [{ url: '/uploads/foto.jpg' }],
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
