const express = require('express');
const AgendaController = require('../controllers/AgendaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { salvarAgendaSchema } = require('../validators/agendaSchemas');
const { idParamSchema } = require('../validators/commonSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/agenda/profissionais/{id}:
 *   get:
 *     tags: [Agenda]
 *     summary: Consulta publicamente a agenda de um profissional
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do usuário profissional.
 *     responses:
 *       '200':
 *         description: Agenda encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Agenda' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/agenda/me:
 *   get:
 *     tags: [Agenda]
 *     summary: Consulta a agenda do profissional autenticado
 *     description: Requer perfil `profissional`.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Agenda do profissional.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Agenda' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   put:
 *     tags: [Agenda]
 *     summary: Substitui serviços e horários da própria agenda
 *     description: Requer perfil `profissional`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AgendaRequest' }
 *     responses:
 *       '200':
 *         description: Agenda salva.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Agenda salva com sucesso.' }
 *                 agenda: { $ref: '#/components/schemas/Agenda' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.get(
    '/profissionais/:id',
    validate(idParamSchema, 'params'),
    AgendaController.buscarPublica
);
router.get('/me', verificarToken, requireRole('profissional'), AgendaController.buscarMinha);
router.put(
    '/me',
    verificarToken,
    requireRole('profissional'),
    validate(salvarAgendaSchema),
    AgendaController.salvarMinha
);

module.exports = router;
