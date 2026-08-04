const express = require('express');
const ServicoController = require('../controllers/ServicoController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const multerConfig = require('../config/multer');
const { solicitacaoRateLimit } = require('../middlewares/rateLimitMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { criarSolicitacaoSchema } = require('../validators/solicitacaoSchemas');
const { idParamSchema } = require('../validators/commonSchemas');
const {
    comLimpezaDeUpload,
    tratarErroDeUpload,
    validarEArmazenarImagens,
} = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/servicos:
 *   post:
 *     tags: [Serviços]
 *     summary: Cria uma solicitação pelo endpoint legado com foto opcional
 *     description: Limite de 20 criações por hora para cada usuário autenticado.
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
 *       '429': { $ref: '#/components/responses/TooManyRequests' }
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
    requireRole('cidadao'),
    multerConfig.single('foto'),
    validate(criarSolicitacaoSchema),
    solicitacaoRateLimit,
    validarEArmazenarImagens,
    comLimpezaDeUpload(ServicoController.criarServico)
);
router.put(
    '/:id/status',
    verificarToken,
    requireRole('profissional'),
    validate(idParamSchema, 'params'),
    ServicoController.atualizarStatus
);

router.use(tratarErroDeUpload);

module.exports = router;
