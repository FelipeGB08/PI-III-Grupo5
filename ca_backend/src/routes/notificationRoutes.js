const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const verificarToken = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
    notificacaoListagemQuerySchema,
} = require('../validators/paginationSchemas');
const { idParamSchema } = require('../validators/commonSchemas');
const {
    atualizarPreferenciasNotificacaoSchema,
} = require('../validators/notificationPreferenceSchemas');

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
 *       '400': { $ref: '#/components/responses/BadRequest' }
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
 * /api/notificacoes/preferencias:
 *   get:
 *     tags: [Notificações]
 *     summary: Consulta a preferência de aviso sobre novos horários de favoritos
 *     description: Requer perfil `cidadao`. Por padrão, o aviso fica ativado.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Preferência do cliente.
 *         content:
 *           application/json:
 *             example: { preferencias: { novos_horarios_favoritos: true } }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   patch:
 *     tags: [Notificações]
 *     summary: Ativa ou desativa somente avisos de novos horários de favoritos
 *     description: Não altera as notificações de chamados, chat ou avaliações.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [novos_horarios_favoritos]
 *             properties:
 *               novos_horarios_favoritos: { type: boolean, example: false }
 *     responses:
 *       '200': { description: Preferência atualizada. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
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

router.get(
    '/',
    verificarToken,
    validate(notificacaoListagemQuerySchema, 'query'),
    NotificationController.listar
);
router.get('/preferencias', verificarToken, NotificationController.buscarPreferencias);
router.patch(
    '/preferencias',
    verificarToken,
    validate(atualizarPreferenciasNotificacaoSchema),
    NotificationController.atualizarPreferencias
);
router.patch('/lidas', verificarToken, NotificationController.marcarTodasLidas);
router.patch(
    '/:id/lida',
    verificarToken,
    validate(idParamSchema, 'params'),
    NotificationController.marcarLida
);

module.exports = router;
