const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     tags: [Categorias]
 *     summary: Lista todas as categorias
 *     responses:
 *       '200':
 *         description: Lista de categorias.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Categoria' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/categorias/admin:
 *   post:
 *     tags: [Categorias, Admin]
 *     summary: Cria uma categoria pelo endpoint administrativo legado
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoriaRequest' }
 *     responses:
 *       '201':
 *         description: Categoria criada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Categoria criada!' }
 *                 categoria: { $ref: '#/components/schemas/Categoria' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/categorias/admin/{id}:
 *   put:
 *     tags: [Categorias, Admin]
 *     summary: Atualiza uma categoria pelo endpoint administrativo legado
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoriaRequest' }
 *     responses:
 *       '200':
 *         description: Categoria atualizada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Categoria atualizada!', categoria: { id: 3, nome_servico: 'Eletricista' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   delete:
 *     tags: [Categorias, Admin]
 *     summary: Exclui uma categoria pelo endpoint administrativo legado
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Categoria excluída.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Categoria excluída com sucesso!' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.get('/', CategoriaController.listar);

router.post('/admin', verificarToken, requireRole('admin'), CategoriaController.criar);
router.put('/admin/:id', verificarToken, requireRole('admin'), CategoriaController.atualizar);
router.delete('/admin/:id', verificarToken, requireRole('admin'), CategoriaController.deletar);

module.exports = router;
