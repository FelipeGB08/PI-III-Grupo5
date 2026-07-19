const express = require('express');
const RelatorioController = require('../controllers/RelatorioController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/admin/relatorios:
 *   get:
 *     tags: [Admin]
 *     summary: Retorna estatísticas administrativas
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Estatísticas consolidadas.
 *         content:
 *           application/json:
 *             schema: { type: object, additionalProperties: true }
 *             example: { total_usuarios: 120, total_profissionais: 35, total_servicos: 240 }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

// Rota protegida para puxar os dados
router.get('/', verificarToken, requireRole('admin'), RelatorioController.gerarRelatorio);

module.exports = router;
