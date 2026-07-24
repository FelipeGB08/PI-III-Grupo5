jest.mock('../../src/models/NotificationModel', () => ({}));

jest.mock('../../src/models/NotificationPreferenceModel', () => ({
    buscarPreferencias: jest.fn(),
    atualizarNovosHorariosFavoritos: jest.fn(),
}));

const NotificationPreferenceModel = require('../../src/models/NotificationPreferenceModel');
const NotificationController = require('../../src/controllers/NotificationController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('NotificationController - preferências de favoritos', () => {
    beforeEach(() => jest.clearAllMocks());

    test('cliente consulta e desativa somente alertas de novos horários favoritos', async () => {
        NotificationPreferenceModel.buscarPreferencias.mockResolvedValue({
            novos_horarios_favoritos: true,
        });
        NotificationPreferenceModel.atualizarNovosHorariosFavoritos.mockResolvedValue({
            novos_horarios_favoritos: false,
        });

        const consultaRes = criarRespostaMock();
        await NotificationController.buscarPreferencias({
            usuarioLogado: { id: 12, perfil_tipo: 'cidadao' },
        }, consultaRes);

        expect(consultaRes.status).toHaveBeenCalledWith(200);
        expect(consultaRes.json).toHaveBeenCalledWith({
            preferencias: { novos_horarios_favoritos: true },
        });

        const atualizacaoRes = criarRespostaMock();
        await NotificationController.atualizarPreferencias({
            usuarioLogado: { id: 12, perfil_tipo: 'cidadao' },
            body: { novos_horarios_favoritos: false },
        }, atualizacaoRes);

        expect(NotificationPreferenceModel.atualizarNovosHorariosFavoritos)
            .toHaveBeenCalledWith({ usuarioId: 12, ativado: false });
        expect(atualizacaoRes.status).toHaveBeenCalledWith(200);
    });

    test('prestador não pode alterar preferência exclusiva do cliente', async () => {
        const res = criarRespostaMock();

        await NotificationController.atualizarPreferencias({
            usuarioLogado: { id: 30, perfil_tipo: 'profissional' },
            body: { novos_horarios_favoritos: false },
        }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(NotificationPreferenceModel.atualizarNovosHorariosFavoritos).not.toHaveBeenCalled();
    });
});
