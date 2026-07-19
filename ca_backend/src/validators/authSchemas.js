const { z } = require('zod');

const emailSchema = z
    .string({ error: 'Informe um e-mail valido.' })
    .trim()
    .email({ message: 'Informe um e-mail valido.' });

const cadastroSchema = z
    .object({
        nome: z
            .string({ error: 'Informe o nome.' })
            .trim()
            .min(1, 'Informe o nome.'),
        email: emailSchema,
        senha: z
            .string({ error: 'Informe a senha.' })
            .min(6, 'A senha deve ter pelo menos 6 caracteres.'),
        cidade_amauc: z.string().trim().optional(),
        cidade: z.string().trim().optional(),
        perfil_tipo: z.string().trim().optional(),
        tipo_usuario: z.string().trim().optional(),
        biografia: z.string().optional(),
        bio: z.string().optional(),
        categoria: z.string().optional(),
        categorias: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .passthrough()
    .superRefine((dados, ctx) => {
        const cidade = dados.cidade_amauc || dados.cidade;
        if (!cidade) {
            ctx.addIssue({
                code: 'custom',
                path: ['cidade_amauc'],
                message: 'Informe a cidade da regiao AMAUC.',
            });
        }

        const perfilBruto = dados.perfil_tipo || dados.tipo_usuario;
        const perfil = String(perfilBruto || '').trim().toLowerCase();
        const perfilNormalizado = perfil === 'cidadão' ? 'cidadao' : perfil;

        if (!['cidadao', 'profissional'].includes(perfilNormalizado)) {
            ctx.addIssue({
                code: 'custom',
                path: ['perfil_tipo'],
                message: 'perfil_tipo deve ser "cidadao" ou "profissional".',
            });
            return;
        }

        if (perfilNormalizado !== 'profissional') return;

        const biografia = String(dados.biografia || dados.bio || '').trim();
        if (biografia.length < 10) {
            ctx.addIssue({
                code: 'custom',
                path: ['biografia'],
                message: 'Para cadastro profissional, a biografia deve ter pelo menos 10 caracteres.',
            });
        }

        const categoria = Array.isArray(dados.categorias)
            ? dados.categorias[0]
            : (dados.categoria || dados.categorias);
        if (!String(categoria || '').trim()) {
            ctx.addIssue({
                code: 'custom',
                path: ['categoria'],
                message: 'Para cadastro profissional, informe ao menos uma categoria.',
            });
        }
    });

const loginSchema = z
    .object({
        email: emailSchema,
        senha: z
            .string({ error: 'Informe a senha.' })
            .min(1, 'Informe a senha.'),
    })
    .passthrough();

const refreshTokenSchema = z
    .object({
        refresh_token: z
            .string({ error: 'Informe o refresh token.' })
            .trim()
            .min(32, 'Refresh token invalido.'),
    })
    .passthrough();

module.exports = {
    cadastroSchema,
    loginSchema,
    refreshTokenSchema,
};
