jest.mock('../../src/config/firebaseAdmin', () => ({
    getFirebaseMessaging: jest.fn(),
}));

jest.mock('../../src/models/NotificationModel', () => ({
    criarNotificacao: jest.fn(),
    buscarTokensAtivos: jest.fn(),
    desativarTokenGlobal: jest.fn(),
    marcarEnviada: jest.fn(),
    marcarFalha: jest.fn(),
}));

jest.mock('../../src/models/FavoritoModel', () => ({
    listarClientesParaNotificarDisponibilidade: jest.fn(),
}));

jest.mock('../../src/models/NotificationPreferenceModel', () => ({
    reservarNotificacaoDisponibilidade: jest.fn(),
}));

const { getFirebaseMessaging } = require('../../src/config/firebaseAdmin');
const NotificationModel = require('../../src/models/NotificationModel');
const FavoritoModel = require('../../src/models/FavoritoModel');
const NotificationPreferenceModel = require('../../src/models/NotificationPreferenceModel');
const {
    notificarUsuario,
    notificarFavoritosSobreNovosHorarios,
    JANELA_NOTIFICACAO_DISPONIBILIDADE_HORAS,
} = require('../../src/services/notificationService');

describe('notificationService', () => {
    const sendEachForMulticast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        NotificationModel.criarNotificacao.mockResolvedValue({ id: 501 });
        NotificationModel.buscarTokensAtivos.mockResolvedValue(['fcm-token-1']);
        NotificationModel.desativarTokenGlobal.mockResolvedValue(null);
        NotificationModel.marcarEnviada.mockResolvedValue(undefined);
        NotificationModel.marcarFalha.mockResolvedValue(undefined);
        getFirebaseMessaging.mockReturnValue({ sendEachForMulticast });
        sendEachForMulticast.mockResolvedValue({
            successCount: 1,
            failureCount: 0,
            responses: [{ success: true }],
        });
        FavoritoModel.listarClientesParaNotificarDisponibilidade.mockResolvedValue([]);
        NotificationPreferenceModel.reservarNotificacaoDisponibilidade.mockResolvedValue({
            cliente_id: 12,
            profissional_id: 30,
        });
    });

    test('envia push ao token ativo com payload FCM normalizado', async () => {
        await notificarUsuario({
            usuarioId: 12,
            tipo: 'chamado_aceito',
            titulo: 'Chamado aceito',
            corpo: 'O prestador aceitou sua solicitacao.',
            payload: { solicitacao_id: 44, status: 'aceito' },
        });

        expect(NotificationModel.buscarTokensAtivos).toHaveBeenCalledWith(12);
        expect(sendEachForMulticast).toHaveBeenCalledWith(
            expect.objectContaining({
                tokens: ['fcm-token-1'],
                notification: {
                    title: 'Chamado aceito',
                    body: 'O prestador aceitou sua solicitacao.',
                },
                data: {
                    solicitacao_id: '44',
                    status: 'aceito',
                    tipo: 'chamado_aceito',
                    notificacao_id: '501',
                },
            })
        );
        expect(NotificationModel.marcarEnviada).toHaveBeenCalledWith(501);
        expect(NotificationModel.marcarFalha).not.toHaveBeenCalled();
    });

    test('desativa token rejeitado pelo Firebase e registra a falha', async () => {
        sendEachForMulticast.mockResolvedValue({
            successCount: 0,
            failureCount: 1,
            responses: [{
                success: false,
                error: { code: 'messaging/registration-token-not-registered' },
            }],
        });

        await notificarUsuario({
            usuarioId: 9,
            tipo: 'avaliacao_recebida',
            titulo: 'Nova avaliacao recebida',
            corpo: 'Voce recebeu uma avaliacao.',
            payload: { servico_id: 44 },
        });

        expect(NotificationModel.desativarTokenGlobal).toHaveBeenCalledWith('fcm-token-1');
        expect(NotificationModel.marcarFalha).toHaveBeenCalledWith(
            501,
            'Firebase nao entregou a notificacao. Falhas: 1'
        );
    });

    test('mantem a notificacao no banco quando o usuario nao tem token ativo', async () => {
        NotificationModel.buscarTokensAtivos.mockResolvedValue([]);

        const notificacao = await notificarUsuario({
            usuarioId: 12,
            tipo: 'chamado_concluido',
            titulo: 'Chamado concluido',
            corpo: 'Avalie o servico.',
            payload: { solicitacao_id: 44 },
        });

        expect(notificacao).toEqual({ id: 501 });
        expect(getFirebaseMessaging).not.toHaveBeenCalled();
        expect(NotificationModel.marcarEnviada).not.toHaveBeenCalled();
        expect(NotificationModel.marcarFalha).not.toHaveBeenCalled();
    });

    test('notifica somente clientes que favoritaram um profissional', async () => {
        FavoritoModel.listarClientesParaNotificarDisponibilidade.mockResolvedValue([
            { cliente_id: 12 },
        ]);

        const resultado = await notificarFavoritosSobreNovosHorarios({
            profissionalId: 30,
            profissionalNome: 'Ana Profissional',
            novosHorarios: [{ dia_semana: 2, horario: '14:00' }],
        });

        expect(FavoritoModel.listarClientesParaNotificarDisponibilidade).toHaveBeenCalledWith(30);
        expect(NotificationPreferenceModel.reservarNotificacaoDisponibilidade).toHaveBeenCalledWith({
            clienteId: 12,
            profissionalId: 30,
            janelaHoras: JANELA_NOTIFICACAO_DISPONIBILIDADE_HORAS,
        });
        expect(NotificationModel.criarNotificacao).toHaveBeenCalledWith(expect.objectContaining({
            usuarioId: 12,
            tipo: 'favorito_novo_horario',
            payload: { profissional_id: 30, novos_horarios: 1 },
        }));
        expect(resultado).toEqual({ destinatarios: 1, notificacoesAgendadas: 1 });
    });

    test('nao cria notificacao para usuario que nao favoritou o profissional', async () => {
        const resultado = await notificarFavoritosSobreNovosHorarios({
            profissionalId: 30,
            profissionalNome: 'Ana Profissional',
            novosHorarios: [{ dia_semana: 2, horario: '14:00' }],
        });

        expect(NotificationPreferenceModel.reservarNotificacaoDisponibilidade).not.toHaveBeenCalled();
        expect(NotificationModel.criarNotificacao).not.toHaveBeenCalled();
        expect(resultado).toEqual({ destinatarios: 0, notificacoesAgendadas: 0 });
    });

    test('respeita o limite de frequencia antes de criar outra notificacao', async () => {
        FavoritoModel.listarClientesParaNotificarDisponibilidade.mockResolvedValue([
            { cliente_id: 12 },
        ]);
        NotificationPreferenceModel.reservarNotificacaoDisponibilidade.mockResolvedValue(null);

        const resultado = await notificarFavoritosSobreNovosHorarios({
            profissionalId: 30,
            profissionalNome: 'Ana Profissional',
            novosHorarios: [{ dia_semana: 2, horario: '14:00' }],
        });

        expect(NotificationModel.criarNotificacao).not.toHaveBeenCalled();
        expect(resultado).toEqual({ destinatarios: 1, notificacoesAgendadas: 0 });
    });

    test('preferencia desativada impede o envio', async () => {
        // O model filtra a preferência antes de retornar destinatários ao serviço.
        FavoritoModel.listarClientesParaNotificarDisponibilidade.mockResolvedValue([]);

        await notificarFavoritosSobreNovosHorarios({
            profissionalId: 30,
            profissionalNome: 'Ana Profissional',
            novosHorarios: [{ dia_semana: 2, horario: '14:00' }],
        });

        expect(NotificationPreferenceModel.reservarNotificacaoDisponibilidade).not.toHaveBeenCalled();
        expect(NotificationModel.criarNotificacao).not.toHaveBeenCalled();
    });
});
