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

const statusSolicitacao = z.enum([
    'pendente',
    'proposta_valor',
    'aceito',
    'recusado',
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

module.exports = {
    favoritoListagemQuerySchema,
    paginacaoQuerySchema,
    solicitacaoListagemQuerySchema,
};
