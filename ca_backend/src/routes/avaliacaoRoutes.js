const express = require('express');
const AvaliacaoController = require('../controllers/AvaliacaoController');
const verificarToken = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { paginacaoQuerySchema } = require('../validators/paginationSchemas');

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
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post('/', verificarToken, AvaliacaoController.criarAvaliacao);
router.get(
    '/profissional/:id',
    validate(paginacaoQuerySchema, 'query'),
    AvaliacaoController.listarDoProfissional
);

module.exports = router;
