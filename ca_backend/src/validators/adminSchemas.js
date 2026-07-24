const { z } = require('zod');

const perfisDeUsuario = ['cidadao', 'profissional', 'admin'];

const paginaAdminSchema = z.coerce
    .number({ error: 'A pagina deve ser um numero inteiro positivo.' })
    .int('A pagina deve ser um numero inteiro positivo.')
    .min(1, 'A pagina deve ser maior ou igual a 1.');

const tamanhoPaginaAdminSchema = z.coerce
    .number({ error: 'O tamanho da pagina deve ser um numero inteiro.' })
    .int('O tamanho da pagina deve ser um numero inteiro.')
    .min(1, 'O tamanho da pagina deve ser maior ou igual a 1.')
    .max(100, 'O tamanho da pagina nao pode ser maior que 100.');

const valorBooleano = z.union([
    z.boolean(),
    z.enum(['true', 'false']),
]).transform((valor) => valor === true || valor === 'true');

const listarUsuariosAdminQuerySchema = z.object({
    page: paginaAdminSchema.optional().default(1),
    pageSize: tamanhoPaginaAdminSchema.optional().default(20),
    perfil_tipo: z.enum(perfisDeUsuario, {
        error: 'O perfil_tipo informado e invalido.',
    }).optional(),
    busca: z.string()
        .trim()
        .min(1, 'A busca deve conter ao menos um caractere.')
        .max(150, 'A busca nao pode ultrapassar 150 caracteres.')
        .optional(),
}).passthrough();

const atualizarStatusUsuarioSchema = z.object({
    ativo: valorBooleano,
});

const exportarRelatorioQuerySchema = z.object({
    formato: z.literal('csv', {
        error: 'O formato de exportacao deve ser csv.',
    }),
}).passthrough();

module.exports = {
    atualizarStatusUsuarioSchema,
    exportarRelatorioQuerySchema,
    listarUsuariosAdminQuerySchema,
};
