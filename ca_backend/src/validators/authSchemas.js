const { z } = require('zod');
const {
    PERFIS_AUTOCADASTRO,
    normalizarPerfilTipo,
} = require('../utils/userRegistrationHelpers');
const { validarSenha } = require('../utils/passwordPolicy');

const emailSchema = z
    .string({ error: 'Informe um e-mail valido.' })
    .trim()
    .email({ message: 'Informe um e-mail valido.' });

const cadastroSchema = z
    .object({
        nome: z
            .string({ error: 'Informe o nome.' })
            .trim()
            .min(1, 'Informe o nome.')
            .max(120, 'O nome deve ter no maximo 120 caracteres.'),
        email: emailSchema,
        senha: z
            .string({ error: 'Informe a senha.' })
            .superRefine((senha, ctx) => {
                const erro = validarSenha(senha);
                if (erro) ctx.addIssue({ code: 'custom', message: erro });
            }),
        cidade_amauc: z.string().trim().max(120).optional(),
        cidade: z.string().trim().max(120).optional(),
        perfil_tipo: z.string().trim().max(30).optional(),
        tipo_usuario: z.string().trim().max(30).optional(),
        biografia: z.string().trim().max(2000).optional(),
        bio: z.string().trim().max(2000).optional(),
        categoria: z.string().trim().max(120).optional(),
        categorias: z.union([
            z.string().trim().max(120),
            z.array(z.string().trim().max(120)).max(20),
        ]).optional(),
        cidades: z.union([
            z.string().trim().max(120),
            z.array(z.string().trim().max(120)).max(20),
        ]).optional(),
        cidades_atendidas: z.union([
            z.string().trim().max(120),
            z.array(z.string().trim().max(120)).max(20),
        ]).optional(),
        telefone: z.string().trim().max(30).optional(),
        endereco_principal: z.string().trim().max(500).optional(),
        latitude: z.union([z.number(), z.string().trim().max(32)]).optional(),
        longitude: z.union([z.number(), z.string().trim().max(32)]).optional(),
    })
    .strict()
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
            .min(1, 'Informe a senha.')
            .max(256, 'Senha invalida.'),
    })
    .strict();

const socialLoginSchema = z
    .object({
        provider: z
            .string({ error: 'Informe o provedor social.' })
            .trim()
            .transform((valor) => valor.toLowerCase())
            .refine(
                (valor) => valor === 'google',
                'provider deve ser google.'
            ),
        token: z.string().trim().max(8192).optional(),
        id_token: z.string().trim().max(8192).optional(),
        access_token: z.string().trim().max(8192).optional(),
        cidade_amauc: z.string().trim().max(120).optional(),
        cidade: z.string().trim().max(120).optional(),
    })
    .strict()
    .superRefine((dados, ctx) => {
        if (!dados.token && !dados.id_token && !dados.access_token) {
            ctx.addIssue({
                code: 'custom',
                path: ['token'],
                message: 'Token do provedor social e obrigatorio.',
            });
        }
    });

const refreshTokenSchema = z
    .object({
        refresh_token: z
            .string({ error: 'Informe o refresh token.' })
            .trim()
            .min(32, 'Refresh token invalido.')
            .max(512, 'Refresh token invalido.'),
    })
    .strict();

module.exports = {
    cadastroSchema,
    loginSchema,
    refreshTokenSchema,
    socialLoginSchema,
};
