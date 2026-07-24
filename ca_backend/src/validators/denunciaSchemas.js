const { z } = require('zod');

const motivosDenuncia = [
    'servico_nao_realizado',
    'cobranca_indevida',
    'comportamento_inadequado',
    'outro',
];

const statusDenuncia = ['aberta', 'em_analise', 'resolvida', 'arquivada'];

const criarDenunciaSchema = z.object({
    motivo: z.enum(motivosDenuncia, {
        error: 'Informe um motivo de denuncia valido.',
    }),
    descricao: z.string({ error: 'Informe a descricao da denuncia.' })
        .trim()
        .min(10, 'Descreva o problema com pelo menos 10 caracteres.')
        .max(4000, 'A descricao deve ter no maximo 4000 caracteres.'),
}).strict();

const listarDenunciasQuerySchema = z.object({
    status: z.enum(statusDenuncia, {
        error: 'Informe um status de denuncia valido.',
    }).optional(),
}).strict();

const atualizarDenunciaSchema = z.object({
    status: z.enum(statusDenuncia, {
        error: 'Informe um status de denuncia valido.',
    }),
    resolucao_admin: z.string()
        .trim()
        .min(5, 'A resolucao deve ter pelo menos 5 caracteres.')
        .max(4000, 'A resolucao deve ter no maximo 4000 caracteres.')
        .optional(),
}).strict().superRefine((dados, ctx) => {
    if (dados.status === 'resolvida' && !dados.resolucao_admin) {
        ctx.addIssue({
            code: 'custom',
            path: ['resolucao_admin'],
            message: 'Informe a resolucao administrativa para concluir a denuncia.',
        });
    }
});

module.exports = {
    atualizarDenunciaSchema,
    criarDenunciaSchema,
    listarDenunciasQuerySchema,
    motivosDenuncia,
    statusDenuncia,
};
