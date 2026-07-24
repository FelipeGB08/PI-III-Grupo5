const express = require('express');
const RelatorioController = require('../controllers/RelatorioController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { exportarRelatorioQuerySchema } = require('../validators/adminSchemas');

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
 * /api/admin/relatorios/export:
 *   get:
 *     tags: [Admin]
 *     summary: Exporta o relatorio administrativo em CSV
 *     description: Requer perfil `admin`. O arquivo inclui indicadores operacionais e de moderacao.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: formato
 *         required: true
 *         schema: { type: string, enum: [csv] }
 *     responses:
 *       '200':
 *         description: Arquivo CSV UTF-8 gerado com sucesso.
 *         content:
 *           text/csv:
 *             schema: { type: string, format: binary }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

// Rota protegida para puxar os dados
router.get('/', verificarToken, requireRole('admin'), RelatorioController.gerarRelatorio);
router.get(
    '/export',
    verificarToken,
    requireRole('admin'),
    validate(exportarRelatorioQuerySchema, 'query'),
    RelatorioController.exportarCsv
);

module.exports = router;
