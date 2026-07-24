const express = require('express');
const PerfilController = require('../controllers/PerfilController');
const ContaController = require('../controllers/ContaController');
const VerificacaoController = require('../controllers/VerificacaoController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const multerConfig = require('../config/multer');
const {
    criarReferenciaDocumentoVerificacao,
    pastaDocumentosVerificacao,
} = require('../config/uploads');
const { uploadRateLimit } = require('../middlewares/rateLimitMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { excluirContaSchema } = require('../validators/contaSchemas');
const {
    paginacaoComLimitQuerySchema,
} = require('../validators/paginationSchemas');
const {
    configurarArmazenamentoDeImagem,
    comLimpezaDeUpload,
    tratarErroDeUpload,
    validarEArmazenarImagens,
} = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/perfil:
 *   post:
 *     tags: [Perfis]
 *     summary: Cria o perfil profissional do usuário autenticado
 *     description: Requer perfil `profissional`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PerfilRequest' }
 *     responses:
 *       '201':
 *         description: Perfil criado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Perfil profissional criado com sucesso!' }
 *                 perfil: { $ref: '#/components/schemas/PerfilProfissional' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   patch:
 *     tags: [Perfis]
 *     summary: Atualiza o Currículo Vivo do profissional autenticado
 *     description: Requer perfil `profissional`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PerfilRequest' }
 *     responses:
 *       '200':
 *         description: Currículo atualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Curriculo Vivo atualizado com sucesso!' }
 *                 perfil: { $ref: '#/components/schemas/PerfilProfissional' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/perfil/meu-perfil:
 *   get:
 *     tags: [Perfis]
 *     summary: Consulta o próprio perfil profissional
 *     description: Requer perfil `profissional`.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Perfil profissional.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PerfilProfissional' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/perfil/busca:
 *   get:
 *     tags: [Perfis]
 *     summary: Busca profissionais por filtros
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: categoria, schema: { type: string } }
 *       - { in: query, name: cidade, schema: { type: string } }
 *       - { in: query, name: atende_rural, schema: { type: boolean } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       '200':
 *         description: Profissionais encontrados. Paginação nos headers `X-Total-Count`, `X-Page`, `X-Limit` e `X-Total-Pages`.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ProfissionalPublico' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/perfil/conta:
 *   delete:
 *     tags: [Perfis]
 *     summary: Exclui a própria conta por anonimização irreversível
 *     description: Remove dados pessoais, revoga todos os refresh tokens e preserva registros históricos sem identificação pessoal.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [confirmacao]
 *             properties:
 *               confirmacao: { type: string, example: 'EXCLUIR MINHA CONTA' }
 *     responses:
 *       '200':
 *         description: Conta anonimizada e sessões revogadas.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Conta excluida e dados pessoais anonimizados com sucesso.', refresh_tokens_revogados: 2 }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/perfil/verificacao:
 *   get:
 *     tags: [Perfis]
 *     summary: Consulta o status da verificacao do proprio perfil profissional
 *     description: Requer perfil `profissional`. O documento em si nao e retornado nesta resposta.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Status da verificacao.
 *         content:
 *           application/json:
 *             example: { verificacao: { perfil_id: 8, status_verificacao: 'pendente', documento_disponivel: true, enviado_em: '2030-01-02T10:00:00.000Z' } }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   post:
 *     tags: [Perfis]
 *     summary: Envia documento de identificacao para verificacao manual
 *     description: Requer perfil `profissional`. Aceita somente JPEG, PNG ou WEBP validos pela assinatura binaria, com ate 5 MB. O arquivo e privado e nao e servido por `/uploads`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [documento]
 *             properties:
 *               documento: { type: string, format: binary }
 *     responses:
 *       '200':
 *         description: Documento enviado e aguardando revisao.
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '429': { $ref: '#/components/responses/TooManyRequests' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/perfil/verificacao/documento:
 *   get:
 *     tags: [Perfis]
 *     summary: Baixa o proprio documento de verificacao
 *     description: Requer perfil `profissional`. Nunca e acessivel pela pasta publica de uploads.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200': { description: Imagem privada do documento. }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post('/', verificarToken, requireRole('profissional'), PerfilController.criar);
router.patch('/', verificarToken, requireRole('profissional'), PerfilController.atualizarMeuPerfil);
router.get('/meu-perfil', verificarToken, requireRole('profissional'), PerfilController.buscarMeuPerfil);
router.get(
    '/verificacao/documento',
    verificarToken,
    requireRole('profissional'),
    VerificacaoController.baixarMeuDocumento
);
router.get(
    '/verificacao',
    verificarToken,
    requireRole('profissional'),
    VerificacaoController.buscarMinhaVerificacao
);
router.post(
    '/verificacao',
    verificarToken,
    requireRole('profissional'),
    uploadRateLimit,
    multerConfig.single('documento'),
    configurarArmazenamentoDeImagem({
        directory: pastaDocumentosVerificacao,
        urlFactory: criarReferenciaDocumentoVerificacao,
    }),
    validarEArmazenarImagens,
    comLimpezaDeUpload(VerificacaoController.enviarDocumento)
);
router.get(
    '/busca',
    verificarToken,
    validate(paginacaoComLimitQuerySchema, 'query'),
    PerfilController.listarProfissionais
);
router.delete('/conta', verificarToken, validate(excluirContaSchema), ContaController.excluirConta);

router.use(tratarErroDeUpload);

module.exports = router;
