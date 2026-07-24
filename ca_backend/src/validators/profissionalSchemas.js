const { z } = require('zod');

const inteiroPositivo = (campo) => z.coerce
    .number({ error: `${campo} deve ser um numero inteiro positivo.` })
    .int(`${campo} deve ser um numero inteiro positivo.`)
    .min(1, `${campo} deve ser maior ou igual a 1.`);

const decimalNaoNegativo = (campo, maximo) => z.coerce
    .number({ error: `${campo} deve ser um numero valido.` })
    .finite(`${campo} deve ser um numero valido.`)
    .min(0, `${campo} nao pode ser negativo.`)
    .max(maximo, `${campo} excede o limite permitido.`);

const dataIso = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'disponivel_em deve usar o formato AAAA-MM-DD.')
    .refine((valor) => {
        const data = new Date(`${valor}T00:00:00.000Z`);
        return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
    }, 'disponivel_em deve ser uma data valida.');

const profissionalBuscaQuerySchema = z.object({
    cidade: z.string().trim().min(1, 'cidade nao pode ser vazia.').max(100).optional(),
    categoria: z.string().trim().min(1, 'categoria nao pode ser vazia.').max(100).optional(),
    atende_rural: z.union([z.boolean(), z.enum(['true', 'false'])]).optional()
        .transform((valor) => (
            valor === undefined ? undefined : (valor === true || valor === 'true')
        )),
    lat: z.coerce.number({ error: 'lat deve ser uma coordenada valida.' })
        .min(-90, 'lat deve estar entre -90 e 90.')
        .max(90, 'lat deve estar entre -90 e 90.')
        .optional(),
    lng: z.coerce.number({ error: 'lng deve ser uma coordenada valida.' })
        .min(-180, 'lng deve estar entre -180 e 180.')
        .max(180, 'lng deve estar entre -180 e 180.')
        .optional(),
    raio_km: decimalNaoNegativo('raio_km', 500).optional(),
    raioKm: decimalNaoNegativo('raioKm', 500).optional(),
    page: inteiroPositivo('page').optional(),
    pagina: inteiroPositivo('pagina').optional(),
    limit: inteiroPositivo('limit').max(50, 'limit deve ser menor ou igual a 50.').optional(),
    tamanho: inteiroPositivo('tamanho').max(50, 'tamanho deve ser menor ou igual a 50.').optional(),
    preco_min: decimalNaoNegativo('preco_min', 1000000).optional(),
    preco_max: decimalNaoNegativo('preco_max', 1000000).optional(),
    nota_minima: decimalNaoNegativo('nota_minima', 5).optional(),
    disponivel_em: dataIso.optional(),
}).passthrough().superRefine((dados, contexto) => {
    if (
        dados.preco_min !== undefined &&
        dados.preco_max !== undefined &&
        dados.preco_min > dados.preco_max
    ) {
        contexto.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['preco_max'],
            message: 'preco_max deve ser maior ou igual a preco_min.',
        });
    }
});

module.exports = {
    profissionalBuscaQuerySchema,
};
