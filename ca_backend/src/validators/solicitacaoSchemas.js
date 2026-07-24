const { z } = require('zod');

function valorPreenchido(valor) {
    return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

function inteiroPositivo(valor) {
    if (!valorPreenchido(valor)) return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

function decimalPositivoValido(valor) {
    if (typeof valor === 'number') {
        return Number.isFinite(valor) && valor > 0;
    }

    if (typeof valor !== 'string') return false;
    const texto = valor.trim();
    return /^\d+(?:\.\d{1,2})?$/.test(texto) && Number(texto) > 0;
}

function coordenadaValida(valor, minimo, maximo) {
    if (!valorPreenchido(valor)) return false;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= minimo && numero <= maximo;
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
        atendimento_latitude: z.any().optional(),
        latitude_atendimento: z.any().optional(),
        atendimentoLatitude: z.any().optional(),
        atendimento_longitude: z.any().optional(),
        longitude_atendimento: z.any().optional(),
        atendimentoLongitude: z.any().optional(),
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

        const latitude =
            dados.atendimento_latitude ??
            dados.latitude_atendimento ??
            dados.atendimentoLatitude;
        const longitude =
            dados.atendimento_longitude ??
            dados.longitude_atendimento ??
            dados.atendimentoLongitude;
        const temLatitude = valorPreenchido(latitude);
        const temLongitude = valorPreenchido(longitude);

        if (temLatitude !== temLongitude) {
            ctx.addIssue({
                code: 'custom',
                path: ['localizacao_atendimento'],
                message: 'Informe latitude e longitude juntas para a localizacao do atendimento.',
            });
        } else if (temLatitude && (
            !coordenadaValida(latitude, -90, 90) ||
            !coordenadaValida(longitude, -180, 180)
        )) {
            ctx.addIssue({
                code: 'custom',
                path: ['localizacao_atendimento'],
                message: 'Latitude ou longitude do atendimento invalida.',
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

const propostaValorSchema = z
    .object({
        preco: z.any().optional(),
        preco_proposto: z.any().optional(),
        motivo: z.string().max(1000, 'O motivo deve ter no maximo 1000 caracteres.').optional(),
        motivo_proposta_valor: z.string().max(1000, 'O motivo deve ter no maximo 1000 caracteres.').optional(),
    })
    .passthrough()
    .superRefine((dados, ctx) => {
        const preco = dados.preco ?? dados.preco_proposto;
        if (!decimalPositivoValido(preco)) {
            ctx.addIssue({
                code: 'custom',
                path: ['preco'],
                message: 'Informe um preco decimal positivo valido.',
            });
        }
    });

const chatMensagemSchema = z
    .object({
        mensagem: z
            .string()
            .trim()
            .min(1, 'A mensagem nao pode estar vazia.')
            .max(1000, 'A mensagem deve ter no maximo 1000 caracteres.'),
        client_id: z
            .string()
            .regex(
                /^[A-Za-z0-9_-]{16,64}$/,
                'Identificador da mensagem invalido.'
            )
            .optional(),
    })
    .strict();

const atualizarStatusSchema = z
    .object({
        status: z.enum(
            ['aceito', 'recusado', 'concluido'],
            { error: 'Status invalido para atualizacao pelo prestador.' }
        ),
    })
    .strict();

module.exports = {
    atualizarStatusSchema,
    chatMensagemSchema,
    criarSolicitacaoSchema,
    propostaValorSchema,
};
