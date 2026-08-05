const express = require('express');
const AvaliacaoController = require('../controllers/AvaliacaoController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { criarAvaliacaoSchema } = require('../validators/avaliacaoSchemas');
const { paginacaoQuerySchema } = require('../validators/paginationSchemas');
const { idParamSchema } = require('../validators/commonSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/avaliacoes:
 *   post:
 *     tags: [Avaliações]
 *     summary: Avalia um serviço concluído
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AvaliacaoRequest' }
 *     responses:
 *       '201':
 *         description: Avaliação criada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Avaliação enviada com sucesso!' }
 *                 avaliacao: { $ref: '#/components/schemas/Avaliacao' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/avaliacoes/cliente:
 *   post:
 *     tags: [Avaliações]
 *     summary: Registra avaliação privada do cliente pelo profissional
 *     description: Disponível somente ao profissional responsável por um serviço concluído. Não é exibida publicamente.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AvaliacaoRequest' }
 *     responses:
 *       '201': { description: Avaliação privada criada. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/avaliacoes/profissional/{id}:
 *   get:
 *     tags: [Avaliações]
 *     summary: Lista publicamente avaliações de um profissional
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       '200':
 *         description: Avaliações encontradas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 media: { type: number, example: 4.8 }
 *                 avaliacoes: { type: array, items: { $ref: '#/components/schemas/Avaliacao' } }
 *                 total: { type: integer, example: 42 }
 *                 hasMore: { type: boolean, example: true }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/avaliacoes/clientes/{id}:
 *   get:
 *     tags: [Avaliações]
 *     summary: Consulta administrativa das avaliações privadas de um cliente
 *     description: Requer perfil administrativo e nunca expõe as avaliações em perfis públicos.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       '200': { description: Avaliações privadas encontradas. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post(
    '/',
    verificarToken,
    requireRole('cidadao'),
    validate(criarAvaliacaoSchema),
    AvaliacaoController.criarAvaliacao
);
router.post(
    '/cliente',
    verificarToken,
    requireRole('profissional'),
    validate(criarAvaliacaoSchema),
    AvaliacaoController.criarAvaliacaoCliente
);
router.get(
    '/profissional/:id',
    validate(idParamSchema, 'params'),
    validate(paginacaoQuerySchema, 'query'),
    AvaliacaoController.listarDoProfissional
);
router.get(
    '/clientes/:id',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    validate(paginacaoQuerySchema, 'query'),
    AvaliacaoController.listarDoClientePrivado
);

module.exports = router;
