const { z } = require('zod');
const {
    PERFIS_AUTOCADASTRO,
    normalizarPerfilTipo,
} = require('../utils/userRegistrationHelpers');

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

        const perfilNormalizado = normalizarPerfilTipo(
            dados.perfil_tipo || dados.tipo_usuario
        );

        if (!perfilNormalizado || !PERFIS_AUTOCADASTRO.has(perfilNormalizado)) {
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

const socialLoginSchema = z
    .object({
        provider: z
            .string({ error: 'Informe o provedor social.' })
            .trim()
            .transform((valor) => valor.toLowerCase())
            .refine(
                (valor) => valor === 'google' || valor === 'apple',
                'provider deve ser google ou apple.'
            ),
        token: z.string().trim().optional(),
        id_token: z.string().trim().optional(),
        access_token: z.string().trim().optional(),
        cidade_amauc: z.string().trim().optional(),
        cidade: z.string().trim().optional(),
        platform: z
            .string()
            .trim()
            .transform((valor) => valor.toLowerCase())
            .pipe(z.enum(['ios', 'android', 'web']))
            .optional(),
        state: z.string().trim().max(2048, 'state do login social e invalido.').optional(),
        nonce: z.string().trim().max(256, 'nonce do login social e invalido.').optional(),
    })
    .passthrough()
    .superRefine((dados, ctx) => {
        if (!dados.token && !dados.id_token && !dados.access_token) {
            ctx.addIssue({
                code: 'custom',
                path: ['token'],
                message: 'Token do provedor social e obrigatorio.',
            });
        }

        if (dados.provider !== 'apple') return;
        for (const campo of ['platform', 'state', 'nonce']) {
            if (dados[campo]) continue;
            ctx.addIssue({
                code: 'custom',
                path: [campo],
                message: `${campo} e obrigatorio no login Apple.`,
            });
        }
    });

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
    socialLoginSchema,
};
