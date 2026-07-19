const express = require('express');
const ServicoController = require('../controllers/ServicoController');
const verificarToken = require('../middlewares/authMiddleware');
const multerConfig = require('../config/multer');

const router = express.Router();

/**
 * @swagger
 * /api/servicos:
 *   post:
 *     tags: [Serviços]
 *     summary: Cria uma solicitação pelo endpoint legado com foto opcional
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - { $ref: '#/components/schemas/SolicitacaoRequest' }
 *               - type: object
 *                 properties:
 *                   foto: { type: string, format: binary }
 *     responses:
 *       '201':
 *         description: Solicitação criada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Solicitacao criada com sucesso.' }
 *                 servico: { $ref: '#/components/schemas/Solicitacao' }
 *                 solicitacao: { $ref: '#/components/schemas/Solicitacao' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/servicos/{id}/status:
 *   put:
 *     tags: [Serviços]
 *     summary: Atualiza o status pelo endpoint legado
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
 *           schema: { $ref: '#/components/schemas/StatusRequest' }
 *     responses:
 *       '200':
 *         description: Status atualizado.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Status atualizado com sucesso.', servico: { id: 101, status: 'aceito' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post(
    '/',
    verificarToken,
    multerConfig.single('foto'),
    ServicoController.criarServico
);
router.put('/:id/status', verificarToken, ServicoController.atualizarStatus);

module.exports = router;
