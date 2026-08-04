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
        prof_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
        profissional_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
        prestador_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
        agenda_servico_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
        // Campos enviados por versoes anteriores do aplicativo. A criacao usa
        // exclusivamente os dados da agenda do profissional, nunca estes valores.
        servico_nome: z.string().trim().max(120).optional(),
        preco: z.union([z.number().finite(), z.string().trim().max(32)]).optional(),
        descricao: z
            .string({ error: 'Informe a descricao da solicitacao.' })
            .trim()
            .min(1, 'Informe a descricao da solicitacao.')
            .max(2000, 'A descricao deve ter no maximo 2000 caracteres.'),
        agendado_para: z.string().datetime({ offset: true }).optional(),
        agendadoPara: z.string().datetime({ offset: true }).optional(),
        data_hora: z.string().datetime({ offset: true }).optional(),
        atendimento_latitude: z.union([z.number(), z.string().max(32)]).optional(),
        latitude_atendimento: z.union([z.number(), z.string().max(32)]).optional(),
        atendimentoLatitude: z.union([z.number(), z.string().max(32)]).optional(),
        atendimento_longitude: z.union([z.number(), z.string().max(32)]).optional(),
        longitude_atendimento: z.union([z.number(), z.string().max(32)]).optional(),
        atendimentoLongitude: z.union([z.number(), z.string().max(32)]).optional(),
        endereco_atendimento: z.string().trim().min(1).max(500).optional(),
        enderecoAtendimento: z.string().trim().min(1).max(500).optional(),
        foto_url: z
            .string()
            .regex(
                /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|png|webp)$/i,
                'foto_url deve ser um upload valido do proprio aplicativo.'
            )
            .max(500)
            .optional(),
        fotoUrl: z
            .string()
            .regex(
                /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|png|webp)$/i,
                'fotoUrl deve ser um upload valido do proprio aplicativo.'
            )
            .max(500)
            .optional(),
        categoria: z.string().trim().min(1).max(120).optional(),
    })
    .strict()
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
