const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/admin/categorias:
 *   post:
 *     tags: [Admin, Categorias]
 *     summary: Cria uma categoria
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
 *             example: { mensagem: 'Categoria criada!', categoria: { id: 3, nome_servico: 'Eletricista' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/categorias/{id}:
 *   put:
 *     tags: [Admin, Categorias]
 *     summary: Atualiza uma categoria
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
 *     tags: [Admin, Categorias]
 *     summary: Exclui uma categoria
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

router.post('/categorias', verificarToken, requireRole('admin'), CategoriaController.criar);
router.put('/categorias/:id', verificarToken, requireRole('admin'), CategoriaController.atualizar);
router.delete('/categorias/:id', verificarToken, requireRole('admin'), CategoriaController.deletar);

module.exports = router;
