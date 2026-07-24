const express = require('express');
const FavoritoController = require('../controllers/FavoritoController');
const verificarToken = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
    favoritoListagemQuerySchema,
} = require('../validators/paginationSchemas');
const {
    profissionalIdParamSchema,
} = require('../validators/commonSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/favoritos:
 *   get:
 *     tags: [Favoritos]
 *     summary: Lista os profissionais favoritos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: lat, schema: { type: number, format: double } }
 *       - { in: query, name: lng, schema: { type: number, format: double } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       '200':
 *         description: Favoritos encontrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favoritos: { type: array, items: { $ref: '#/components/schemas/ProfissionalPublico' } }
 *                 ids: { type: array, items: { type: integer } }
 *                 total: { type: integer, example: 1 }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/favoritos/ids:
 *   get:
 *     tags: [Favoritos]
 *     summary: Lista somente os IDs favoritos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: IDs encontrados.
 *         content:
 *           application/json:
 *             example: { ids: [20, 31], total: 2 }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/favoritos/{profissionalId}:
 *   post:
 *     tags: [Favoritos]
 *     summary: Adiciona um profissional aos favoritos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: profissionalId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '201':
 *         description: Favorito adicionado.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Profissional adicionado aos favoritos.', favorito: { usuario_id: 12, profissional_id: 20 } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   delete:
 *     tags: [Favoritos]
 *     summary: Remove um profissional dos favoritos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: profissionalId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Favorito removido.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Profissional removido dos favoritos.' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.get(
    '/',
    verificarToken,
    validate(favoritoListagemQuerySchema, 'query'),
    FavoritoController.listar
);
router.get('/ids', verificarToken, FavoritoController.ids);
router.post(
    '/:profissionalId',
    verificarToken,
    validate(profissionalIdParamSchema, 'params'),
    FavoritoController.adicionar
);
router.delete(
    '/:profissionalId',
    verificarToken,
    validate(profissionalIdParamSchema, 'params'),
    FavoritoController.remover
);

module.exports = router;
