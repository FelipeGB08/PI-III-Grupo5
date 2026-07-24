const { z } = require('zod');

const idPositivo = z.coerce
    .number({ error: 'O ID deve ser um numero inteiro positivo.' })
    .int('O ID deve ser um numero inteiro positivo.')
    .min(1, 'O ID deve ser maior ou igual a 1.');

const idParamSchema = z
    .object({
        id: idPositivo,
    })
    .passthrough();

const profissionalIdParamSchema = z
    .object({
        profissionalId: idPositivo,
    })
    .passthrough();

module.exports = {
    idParamSchema,
    profissionalIdParamSchema,
};
