const {
    diaSemanaAmaUc,
    horaAmaUc,
    proximoDiaUtilComHorario,
    timestampLocal,
} = require('../../scripts/e2e-flow');

describe('datas do fluxo E2E', () => {
    test('gera horario de agendamento no fuso da AMAUC mesmo em executor UTC', () => {
        const agoraUtc = new Date('2026-08-04T02:30:00.000Z');
        const agendamento = proximoDiaUtilComHorario('10:00', agoraUtc);

        expect(timestampLocal(agendamento)).toBe('2026-08-04T10:00:00-03:00');
        expect(diaSemanaAmaUc(agendamento)).toBe(2);
    });

    test('pula o fim de semana e interpreta retorno do backend no fuso da AMAUC', () => {
        const sabadoUtc = new Date('2026-08-08T14:00:00.000Z');
        const agendamento = proximoDiaUtilComHorario('14:00', sabadoUtc);

        expect(timestampLocal(agendamento)).toBe('2026-08-10T14:00:00-03:00');
        expect(horaAmaUc(new Date('2026-08-10T17:00:00.000Z'))).toBe(14);
    });
});
