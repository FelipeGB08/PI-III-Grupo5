const { z } = require('zod');

const atualizarPreferenciasNotificacaoSchema = z.object({
    novos_horarios_favoritos: z.boolean({
        error: 'novos_horarios_favoritos deve ser verdadeiro ou falso.',
    }),
}).strict();

module.exports = {
    atualizarPreferenciasNotificacaoSchema,
};
