jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const NotificationPreferenceModel = require('../../src/models/NotificationPreferenceModel');

describe('NotificationPreferenceModel', () => {
    beforeEach(() => jest.clearAllMocks());

    test('mantém a preferência de horários favoritos ativada por padrão', async () => {
        pool.query.mockResolvedValue({
            rows: [{ novos_horarios_favoritos: true }],
        });

        const preferencias = await NotificationPreferenceModel.buscarPreferencias(12);

        expect(preferencias).toEqual({ novos_horarios_favoritos: true });
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('COALESCE(p.novos_horarios_favoritos, TRUE)'),
            [12]
        );
    });

    test('reserva a notificação de forma persistente respeitando a janela por cliente e profissional', async () => {
        pool.query.mockResolvedValue({
            rows: [{ cliente_id: 12, profissional_id: 30 }],
        });

        const reserva = await NotificationPreferenceModel.reservarNotificacaoDisponibilidade({
            clienteId: 12,
            profissionalId: 30,
            janelaHoras: 6,
        });

        expect(reserva).toEqual({ cliente_id: 12, profissional_id: 30 });
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('ON CONFLICT (cliente_id, profissional_id)'),
            [12, 30, 6]
        );
        expect(pool.query.mock.calls[0][0]).toContain("COALESCE(p.novos_horarios_favoritos, TRUE) = TRUE");
        expect(pool.query.mock.calls[0][0]).toContain("$3 * INTERVAL '1 hour'");
    });

    test('não reserva quando o cliente desativou o aviso', async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const reserva = await NotificationPreferenceModel.reservarNotificacaoDisponibilidade({
            clienteId: 12,
            profissionalId: 30,
        });

        expect(reserva).toBeNull();
    });
});
