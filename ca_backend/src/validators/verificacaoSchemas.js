const { z } = require('zod');

const rejeitarVerificacaoSchema = z.object({
    motivo_rejeicao: z
        .string({ error: 'Informe o motivo da rejeicao.' })
        .trim()
        .min(5, 'O motivo da rejeicao deve ter ao menos 5 caracteres.')
        .max(1000, 'O motivo da rejeicao deve ter no maximo 1000 caracteres.'),
}).strict();

module.exports = {
    rejeitarVerificacaoSchema,
};
