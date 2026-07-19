const { z } = require('zod');

function horarioValido(valor) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || '').trim());
}

function diaValido(valor) {
    const dia = Number(valor);
    return Number.isInteger(dia) && dia >= 1 && dia <= 7;
}

const servicoAgendaSchema = z
    .object({
        nome: z
            .string({ error: 'Cada servico precisa ter nome com ao menos 3 caracteres.' })
            .trim()
            .min(3, 'Cada servico precisa ter nome com ao menos 3 caracteres.'),
        duracao_minutos: z.any().optional(),
        duracaoMinutos: z.any().optional(),
        preco: z.any().optional(),
    })
    .passthrough()
    .superRefine((servico, ctx) => {
        const duracao = Number(servico.duracao_minutos ?? servico.duracaoMinutos);
        if (!Number.isFinite(duracao) || duracao < 15 || duracao > 480) {
            ctx.addIssue({
                code: 'custom',
                path: ['duracao_minutos'],
                message: 'A duracao de cada servico deve ficar entre 15 e 480 minutos.',
            });
        }

        const preco = Number(servico.preco);
        if (!Number.isFinite(preco) || preco <= 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['preco'],
                message: 'O preco de cada servico deve ser maior que zero.',
            });
        }
    });

const salvarAgendaSchema = z
    .object({
        servicos: z
            .array(servicoAgendaSchema, {
                error: 'Informe entre 1 e 12 servicos.',
            })
            .min(1, 'Informe entre 1 e 12 servicos.')
            .max(12, 'Informe entre 1 e 12 servicos.'),
        horarios: z
            .array(z.any(), { error: 'Informe ao menos um horario valido.' })
            .min(1, 'Informe ao menos um horario valido.'),
        dias_semana: z.array(z.any()).optional(),
        diasSemana: z.array(z.any()).optional(),
    })
    .passthrough()
    .superRefine((agenda, ctx) => {
        const horarios = agenda.horarios;
        let quantidadeValida = 0;

        if (horarios.every((item) => typeof item === 'string')) {
            const diasRecebidos = Array.isArray(agenda.dias_semana)
                ? agenda.dias_semana
                : agenda.diasSemana;
            const dias = Array.isArray(diasRecebidos) && diasRecebidos.length > 0
                ? diasRecebidos.filter(diaValido)
                : [1, 2, 3, 4, 5];
            const horasValidas = horarios.filter(horarioValido);
            quantidadeValida = new Set(dias.map(Number)).size * horasValidas.length;
        } else {
            quantidadeValida = horarios.filter((item) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
                return diaValido(item.dia_semana ?? item.diaSemana) && horarioValido(item.horario);
            }).length;
        }

        if (quantidadeValida === 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['horarios'],
                message: 'Informe ao menos um horario valido.',
            });
        }
    });

module.exports = {
    salvarAgendaSchema,
};
