const { z } = require('zod');

function inteiroNoIntervalo(valor, minimo, maximo) {
    if (
        !((typeof valor === 'number' && Number.isFinite(valor)) ||
        (typeof valor === 'string' && /^\d+$/.test(valor.trim())))
    ) {
        return false;
    }
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= minimo && numero <= maximo;
}

const criarAvaliacaoSchema = z
    .object({
        servico_id: z.any().optional(),
        solicitacao_id: z.any().optional(),
        nota_estrelas: z.any().optional(),
        nota: z.any().optional(),
        comentario: z
            .string({ error: 'O comentario deve ser um texto.' })
            .max(2000, 'O comentario deve ter no maximo 2000 caracteres.')
            .optional(),
    })
    .passthrough()
    .superRefine((dados, ctx) => {
        const servicoId = dados.servico_id ?? dados.solicitacao_id;
        if (!inteiroNoIntervalo(servicoId, 1, Number.MAX_SAFE_INTEGER)) {
            ctx.addIssue({
                code: 'custom',
                path: ['servico_id'],
                message: 'Informe um servico valido para a avaliacao.',
            });
        }

        const nota = dados.nota_estrelas ?? dados.nota;
        if (!inteiroNoIntervalo(nota, 1, 5)) {
            ctx.addIssue({
                code: 'custom',
                path: ['nota_estrelas'],
                message: 'A nota deve ser um numero inteiro entre 1 e 5.',
            });
        }
    });

module.exports = {
    criarAvaliacaoSchema,
};
