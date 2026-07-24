const { z } = require('zod');

const page = z.coerce
    .number({ error: 'page deve ser um numero inteiro positivo.' })
    .int('page deve ser um numero inteiro positivo.')
    .min(1, 'page deve ser maior ou igual a 1.')
    .default(1);

const pageSize = z.coerce
    .number({ error: 'pageSize deve ser um numero inteiro positivo.' })
    .int('pageSize deve ser um numero inteiro positivo.')
    .min(1, 'pageSize deve ser maior ou igual a 1.')
    .max(100, 'pageSize deve ser menor ou igual a 100.')
    .default(20);

const pageLegada = z.coerce
    .number({ error: 'page deve ser um numero inteiro positivo.' })
    .int('page deve ser um numero inteiro positivo.')
    .min(1, 'page deve ser maior ou igual a 1.');

const limitLegado = z.coerce
    .number({ error: 'limit deve ser um numero inteiro positivo.' })
    .int('limit deve ser um numero inteiro positivo.')
    .min(1, 'limit deve ser maior ou igual a 1.')
    .max(50, 'limit deve ser menor ou igual a 50.');

const statusSolicitacao = z.enum([
    'pendente',
    'proposta_valor',
    'aceito',
    'recusado',
    'aguardando_confirmacao_cliente',
    'concluido',
    'cancelado_cliente',
    'remarcacao_solicitada',
]);

const paginacaoQuerySchema = z
    .object({ page, pageSize })
    .passthrough();

const solicitacaoListagemQuerySchema = z
    .object({
        page,
        pageSize,
        status: statusSolicitacao.optional(),
    })
    .passthrough();

const favoritoListagemQuerySchema = z
    .object({
        page,
        pageSize,
        lat: z.coerce
            .number({ error: 'lat deve ser uma coordenada valida.' })
            .min(-90, 'lat deve estar entre -90 e 90.')
            .max(90, 'lat deve estar entre -90 e 90.')
            .optional(),
        lng: z.coerce
            .number({ error: 'lng deve ser uma coordenada valida.' })
            .min(-180, 'lng deve estar entre -180 e 180.')
            .max(180, 'lng deve estar entre -180 e 180.')
            .optional(),
    })
    .passthrough();

const paginacaoComLimitQuerySchema = z
    .object({
        page: pageLegada.optional(),
        pagina: pageLegada.optional(),
        limit: limitLegado.optional(),
        tamanho: limitLegado.optional(),
    })
    .passthrough();

const notificacaoListagemQuerySchema = paginacaoComLimitQuerySchema.extend({
    nao_lidas: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
});

const chatMensagensQuerySchema = z
    .object({
        before_id: z.coerce
            .number({ error: 'before_id deve ser um numero inteiro positivo.' })
            .int('before_id deve ser um numero inteiro positivo.')
            .min(1, 'before_id deve ser maior ou igual a 1.')
            .optional(),
        limit: z.coerce
            .number({ error: 'limit deve ser um numero inteiro positivo.' })
            .int('limit deve ser um numero inteiro positivo.')
            .min(1, 'limit deve ser maior ou igual a 1.')
            .max(100, 'limit deve ser menor ou igual a 100.')
            .optional(),
    })
    .passthrough();

module.exports = {
    chatMensagensQuerySchema,
    favoritoListagemQuerySchema,
    notificacaoListagemQuerySchema,
    paginacaoComLimitQuerySchema,
    paginacaoQuerySchema,
    solicitacaoListagemQuerySchema,
};
