const { z } = require('zod');

function valorPreenchido(valor) {
    return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

function inteiroPositivo(valor) {
    if (!valorPreenchido(valor)) return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

const criarSolicitacaoSchema = z
    .object({
        prof_id: z.any().optional(),
        profissional_id: z.any().optional(),
        prestador_id: z.any().optional(),
        agenda_servico_id: z.any().optional(),
        descricao: z
            .string({ error: 'Informe a descricao da solicitacao.' })
            .trim()
            .min(1, 'Informe a descricao da solicitacao.'),
        agendado_para: z.any().optional(),
        agendadoPara: z.any().optional(),
        data_hora: z.any().optional(),
    })
    .passthrough()
    .superRefine((dados, ctx) => {
        const profissionalId = dados.prof_id || dados.profissional_id || dados.prestador_id;
        if (!inteiroPositivo(profissionalId)) {
            ctx.addIssue({
                code: 'custom',
                path: ['profissional_id'],
                message: 'Informe um profissional valido para a solicitacao.',
            });
        }

        if (!inteiroPositivo(dados.agenda_servico_id)) {
            ctx.addIssue({
                code: 'custom',
                path: ['agenda_servico_id'],
                message: 'agenda_servico_id e obrigatorio para o agendamento.',
            });
        }

        const dataInformada = dados.agendado_para || dados.agendadoPara || dados.data_hora;
        if (!valorPreenchido(dataInformada)) {
            ctx.addIssue({
                code: 'custom',
                path: ['agendado_para'],
                message: 'Informe a data e o horario do agendamento.',
            });
            return;
        }

        if (!['string', 'number'].includes(typeof dataInformada)) {
            ctx.addIssue({
                code: 'custom',
                path: ['agendado_para'],
                message: 'Data ou horario de agendamento invalido.',
            });
            return;
        }

        const data = new Date(dataInformada);
        if (Number.isNaN(data.getTime())) {
            ctx.addIssue({
                code: 'custom',
                path: ['agendado_para'],
                message: 'Data ou horario de agendamento invalido.',
            });
            return;
        }

        if (data.getTime() <= Date.now()) {
            ctx.addIssue({
                code: 'custom',
                path: ['agendado_para'],
                message: 'Nao e permitido agendar em horario passado.',
            });
        }
    });

module.exports = {
    criarSolicitacaoSchema,
};
