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

const { getFirebaseMessaging } = require('../../src/config/firebaseAdmin');
const NotificationModel = require('../../src/models/NotificationModel');
const { notificarUsuario } = require('../../src/services/notificationService');

describe('notificationService', () => {
    const sendEachForMulticast = jest.fn();

    beforeEach(() => {
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
});
