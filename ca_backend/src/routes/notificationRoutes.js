const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/notificacoes:
 *   get:
 *     tags: [Notificações]
 *     summary: Lista notificações do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: nao_lidas, schema: { type: boolean, default: false } }
 *     responses:
 *       '200':
 *         description: Notificações paginadas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificacoes: { type: array, items: { $ref: '#/components/schemas/Notificacao' } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/notificacoes/lidas:
 *   patch:
 *     tags: [Notificações]
 *     summary: Marca todas as notificações como lidas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Notificações atualizadas.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Notificacoes marcadas como lidas.', atualizadas: 3 }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/notificacoes/{id}/lida:
 *   patch:
 *     tags: [Notificações]
 *     summary: Marca uma notificação como lida
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Notificação atualizada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificacao: { $ref: '#/components/schemas/Notificacao' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.get('/', verificarToken, NotificationController.listar);
router.patch('/lidas', verificarToken, NotificationController.marcarTodasLidas);
router.patch('/:id/lida', verificarToken, NotificationController.marcarLida);

module.exports = router;
