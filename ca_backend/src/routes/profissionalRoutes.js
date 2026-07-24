const express = require('express');
const ProfissionalController = require('../controllers/ProfissionalController');
const validate = require('../middlewares/validateMiddleware');
const { profissionalBuscaQuerySchema } = require('../validators/profissionalSchemas');
const { idParamSchema } = require('../validators/commonSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/profissionais:
 *   get:
 *     tags: [Profissionais]
 *     summary: Lista publicamente profissionais por filtros e localização
 *     parameters:
 *       - { in: query, name: cidade, schema: { type: string }, example: 'Concórdia' }
 *       - { in: query, name: categoria, schema: { type: string }, example: 'TI' }
 *       - { in: query, name: atende_rural, schema: { type: boolean } }
 *       - { in: query, name: lat, schema: { type: number, format: double } }
 *       - { in: query, name: lng, schema: { type: number, format: double } }
 *       - { in: query, name: raio_km, schema: { type: number, format: double } }
 *       - { in: query, name: preco_min, schema: { type: number, minimum: 0 }, description: 'Preco minimo de ao menos um servico ativo da agenda.' }
 *       - { in: query, name: preco_max, schema: { type: number, minimum: 0 }, description: 'Preco maximo de ao menos um servico ativo da agenda.' }
 *       - { in: query, name: nota_minima, schema: { type: number, minimum: 0, maximum: 5 } }
 *       - { in: query, name: disponivel_em, schema: { type: string, format: date }, description: 'Data AAAA-MM-DD com ao menos um horario ativo e livre.' }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       '200':
 *         description: Profissionais encontrados. Paginação informada nos headers de resposta.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ProfissionalPublico' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/profissionais/{id}:
 *   get:
 *     tags: [Profissionais]
 *     summary: Consulta publicamente um profissional
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Perfil público encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ProfissionalPublico' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.get(
    '/',
    validate(profissionalBuscaQuerySchema, 'query'),
    ProfissionalController.listar
);
router.get(
    '/:id',
    validate(idParamSchema, 'params'),
    ProfissionalController.buscarPorId
);

module.exports = router;
