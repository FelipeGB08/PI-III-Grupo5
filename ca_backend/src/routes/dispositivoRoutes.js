const express = require('express');
const DispositivoController = require('../controllers/DispositivoController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/dispositivos/token:
 *   post:
 *     tags: [Dispositivos]
 *     summary: Registra ou atualiza um token de push
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceTokenRequest' }
 *     responses:
 *       '200':
 *         description: Token registrado.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Token do dispositivo registrado.', device_token: { token: 'fcm-device-token', plataforma: 'android' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   delete:
 *     tags: [Dispositivos]
 *     summary: Remove um token de push
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceTokenRequest' }
 *     responses:
 *       '200':
 *         description: Token removido.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Token do dispositivo removido.' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post('/token', verificarToken, DispositivoController.salvarToken);
router.delete('/token', verificarToken, DispositivoController.removerToken);

module.exports = router;
