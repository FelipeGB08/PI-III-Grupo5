const express = require('express');
const SolicitacaoController = require('../controllers/SolicitacaoController');
const DenunciaController = require('../controllers/DenunciaController');
const ChatController = require('../controllers/ChatController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const multerConfig = require('../config/multer');
const {
    comLimpezaDeUpload,
    tratarErroDeUpload,
    validarEArmazenarImagens,
} = require('../middlewares/uploadMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
    chatRateLimit,
    solicitacaoRateLimit,
    uploadRateLimit,
} = require('../middlewares/rateLimitMiddleware');
const {
    atualizarStatusSchema,
    chatMensagemSchema,
    criarSolicitacaoSchema,
    propostaValorSchema,
} = require('../validators/solicitacaoSchemas');
const { criarDenunciaSchema } = require('../validators/denunciaSchemas');
const {
    chatMensagensQuerySchema,
    solicitacaoListagemQuerySchema,
} = require('../validators/paginationSchemas');
const { idParamSchema } = require('../validators/commonSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/solicitacoes:
 *   post:
 *     tags: [Solicitações]
 *     summary: Cria uma solicitação de serviço agendada
 *     description: Limite de 20 criações por hora para cada usuário autenticado.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SolicitacaoRequest' }
 *     responses:
 *       '201':
 *         description: Solicitação criada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Solicitacao criada com sucesso.' }
 *                 solicitacao: { $ref: '#/components/schemas/Solicitacao' }
 *                 servico: { $ref: '#/components/schemas/Solicitacao' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '409':
 *         description: Conflito de horário.
 *         content:
 *           application/json:
 *             example: { erro: 'Profissional ja possui atendimento neste horario.' }
 *       '429': { $ref: '#/components/responses/TooManyRequests' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/meus-pedidos:
 *   get:
 *     tags: [Solicitações]
 *     summary: Lista solicitações do cidadão autenticado
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       '200':
 *         description: Pedidos encontrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pedidos: { type: array, items: { $ref: '#/components/schemas/Solicitacao' } }
 *                 solicitacoes: { type: array, items: { $ref: '#/components/schemas/Solicitacao' } }
 *                 total: { type: integer, example: 42 }
 *                 hasMore: { type: boolean, example: true }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/minhas-solicitacoes:
 *   get:
 *     tags: [Solicitações]
 *     summary: Lista solicitações recebidas pelo profissional autenticado
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       '200':
 *         description: Solicitações encontradas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 solicitacoes: { type: array, items: { $ref: '#/components/schemas/Solicitacao' } }
 *                 pedidos: { type: array, items: { $ref: '#/components/schemas/Solicitacao' } }
 *                 total: { type: integer, example: 42 }
 *                 hasMore: { type: boolean, example: true }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/financeiro:
 *   get:
 *     tags: [Solicitações]
 *     summary: Retorna histórico e resumo financeiro do usuário
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       '200':
 *         description: Dados financeiros.
 *         content:
 *           application/json:
 *             schema: { type: object, additionalProperties: true }
 *             example: { resumo: { total_concluido: 120, total_cancelado: 0 }, itens: [] }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/conversas:
 *   get:
 *     tags: [Chat]
 *     summary: Lista conversas do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Conversas encontradas.
 *         content:
 *           application/json:
 *             example: { conversas: [{ servico_id: 101, ultima_mensagem: 'Podemos confirmar?' }], total: 1 }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}:
 *   get:
 *     tags: [Solicitações]
 *     summary: Consulta uma solicitação acessível ao usuário
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Solicitação encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 solicitacao: { $ref: '#/components/schemas/Solicitacao' }
 *                 servico: { $ref: '#/components/schemas/Solicitacao' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/mensagens:
 *   get:
 *     tags: [Chat]
 *     summary: Lista mensagens de uma solicitação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: before_id, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer, default: 80 } }
 *     responses:
 *       '200':
 *         description: Mensagens encontradas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagens: { type: array, items: { $ref: '#/components/schemas/ChatMensagem' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   post:
 *     tags: [Chat]
 *     summary: Envia uma mensagem na solicitação
 *     description: Limite compartilhado de 60 mensagens por minuto por usuário, também aplicado ao evento Socket.IO chat:send. O client_id opcional torna novas tentativas idempotentes.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ChatMensagemRequest' }
 *     responses:
 *       '201':
 *         description: Mensagem enviada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { $ref: '#/components/schemas/ChatMensagem' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '429': { $ref: '#/components/responses/TooManyRequests' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/fotos-conclusao:
 *   post:
 *     tags: [Solicitações, Uploads]
 *     summary: Anexa até cinco fotos de conclusão
 *     description: Aceita no maximo cinco imagens JPEG, PNG ou WEBP validas pela assinatura binaria, com ate 5 MB por arquivo. Limite de 30 requisicoes de upload por hora para cada usuario autenticado.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [fotos]
 *             properties:
 *               fotos:
 *                 type: array
 *                 maxItems: 5
 *                 items: { type: string, format: binary }
 *     responses:
 *       '200':
 *         description: Fotos anexadas.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Fotos de conclusao anexadas com sucesso.', solicitacao: { id: 101, fotos_conclusao: ['/uploads/evidencia.jpg'] } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '429': { $ref: '#/components/responses/TooManyRequests' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/status:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Atualiza o status da solicitação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
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
 *             example: { mensagem: 'Status atualizado com sucesso.', solicitacao: { id: 101, status: 'aceito' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '409':
 *         description: Conclusão sem chamado aceito ou sem foto de evidência.
 *         content:
 *           application/json:
 *             example: { erro: 'A conclusao exige um chamado aceito e ao menos uma foto de evidencia.' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/confirmar-conclusao:
 *   patch:
 *     tags: [SolicitaÃ§Ãµes]
 *     summary: Cliente confirma a conclusÃ£o informada pelo prestador
 *     description: Finaliza um chamado que esteja aguardando confirmaÃ§Ã£o do cliente. Sem confirmaÃ§Ã£o manual, a finalizaÃ§Ã£o ocorre automaticamente apÃ³s 72 horas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200':
 *         description: ConclusÃ£o confirmada manual ou automaticamente.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Conclusao confirmada com sucesso.', solicitacao: { id: 101, status: 'concluido', conclusao_confirmada_automaticamente: false } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '409':
 *         description: Chamado sem confirmaÃ§Ã£o de conclusÃ£o pendente.
 *         content:
 *           application/json:
 *             example: { erro: 'Solicitacao nao encontrada, ja concluida ou sem confirmacao pendente.' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/proposta-valor:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Profissional propõe novo valor
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PropostaValorRequest' }
 *     responses:
 *       '200':
 *         description: Proposta enviada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Proposta de valor enviada ao cliente.', solicitacao: { id: 101, preco_proposto: 150 } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/proposta-valor/aceitar:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Cliente aceita a proposta de valor
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200':
 *         description: Proposta aceita.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Proposta de valor aceita.', solicitacao: { id: 101, status: 'pendente' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/proposta-valor/recusar:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Cliente recusa a proposta de valor
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200':
 *         description: Proposta recusada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Proposta de valor recusada.', solicitacao: { id: 101, status: 'pendente' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/cancelar:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Cliente cancela a própria solicitação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CancelamentoRequest' }
 *     responses:
 *       '200':
 *         description: Solicitação cancelada com política e reembolso calculados.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Solicitacao cancelada com sucesso.', politica_cancelamento: 'cancelamento_antecipado', reembolso_status: 'reembolso_integral' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/remarcar:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Profissional propõe uma remarcação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RemarcacaoRequest' }
 *     responses:
 *       '200':
 *         description: Remarcação enviada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Proposta de remarcacao enviada ao cliente.', solicitacao: { id: 101, status: 'remarcacao_solicitada' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '409':
 *         description: Conflito com outro agendamento.
 *         content:
 *           application/json:
 *             example: { erro: 'Profissional ja possui atendimento neste horario.' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/remarcacao/aceitar:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Cliente aceita a remarcação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200':
 *         description: Remarcação aceita.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Remarcacao aceita com sucesso.', solicitacao: { id: 101, status: 'aceito' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/solicitacoes/{id}/remarcacao/recusar:
 *   patch:
 *     tags: [Solicitações]
 *     summary: Cliente recusa a remarcação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200':
 *         description: Remarcação recusada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Remarcacao recusada. O horario original foi mantido.', solicitacao: { id: 101, status: 'aceito' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

/**
 * @swagger
 * /api/solicitacoes/{id}/denuncia:
 *   post:
 *     tags: [SolicitaÃ§Ãµes]
 *     summary: Registra uma denuncia ou disputa sobre um chamado
 *     description: Requer autenticaÃ§Ã£o. Somente o cliente ou o profissional participante do chamado pode registrar a denuncia.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo, descricao]
 *             properties:
 *               motivo: { type: string, enum: [servico_nao_realizado, cobranca_indevida, comportamento_inadequado, outro] }
 *               descricao: { type: string, minLength: 10, maxLength: 4000, example: 'O atendimento combinado nao foi realizado.' }
 *     responses:
 *       '201': { description: Denuncia registrada para analise administrativa. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { description: Chamado inexistente ou sem participacao do usuario autenticado. }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post(
    '/',
    verificarToken,
    requireRole('cidadao'),
    solicitacaoRateLimit,
    validate(criarSolicitacaoSchema),
    SolicitacaoController.criarSolicitacao
);
router.post(
    '/:id/denuncia',
    verificarToken,
    validate(idParamSchema, 'params'),
    validate(criarDenunciaSchema),
    DenunciaController.criar
);
router.get(
    '/meus-pedidos',
    verificarToken,
    requireRole('cidadao'),
    validate(solicitacaoListagemQuerySchema, 'query'),
    SolicitacaoController.listarMeusPedidos
);
router.get(
    '/minhas-solicitacoes',
    verificarToken,
    requireRole('profissional'),
    validate(solicitacaoListagemQuerySchema, 'query'),
    SolicitacaoController.listarMinhasSolicitacoes
);
router.get(
    '/financeiro',
    verificarToken,
    validate(solicitacaoListagemQuerySchema, 'query'),
    SolicitacaoController.buscarFinanceiro
);
router.get('/conversas', verificarToken, ChatController.listarConversas);
router.get(
    '/:id',
    verificarToken,
    validate(idParamSchema, 'params'),
    SolicitacaoController.buscarPorId
);
router.get(
    '/:id/mensagens',
    verificarToken,
    validate(idParamSchema, 'params'),
    validate(chatMensagensQuerySchema, 'query'),
    ChatController.listarMensagens
);
router.post(
    '/:id/mensagens',
    verificarToken,
    validate(idParamSchema, 'params'),
    chatRateLimit,
    validate(chatMensagemSchema),
    ChatController.enviarMensagem
);

router.post(
    '/:id/fotos-conclusao',
    verificarToken,
    requireRole('profissional'),
    validate(idParamSchema, 'params'),
    uploadRateLimit,
    multerConfig.array('fotos', 5),
    validarEArmazenarImagens,
    comLimpezaDeUpload(SolicitacaoController.uploadFotosConclusao)
);
router.patch(
    '/:id/status',
    verificarToken,
    requireRole('profissional'),
    validate(idParamSchema, 'params'),
    validate(atualizarStatusSchema),
    SolicitacaoController.atualizarStatus
);
router.patch(
    '/:id/confirmar-conclusao',
    verificarToken,
    requireRole('cidadao'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.confirmarConclusao
);
router.patch(
    '/:id/proposta-valor',
    verificarToken,
    requireRole('profissional'),
    validate(idParamSchema, 'params'),
    validate(propostaValorSchema),
    SolicitacaoController.proporValor
);
router.patch(
    '/:id/proposta-valor/aceitar',
    verificarToken,
    requireRole('cidadao'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.aceitarPropostaValor
);
router.patch(
    '/:id/proposta-valor/recusar',
    verificarToken,
    requireRole('cidadao'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.recusarPropostaValor
);
router.patch(
    '/:id/cancelar',
    verificarToken,
    requireRole('cidadao'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.cancelarPeloCliente
);
router.patch(
    '/:id/remarcar',
    verificarToken,
    requireRole('profissional'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.solicitarRemarcacao
);
router.patch(
    '/:id/remarcacao/aceitar',
    verificarToken,
    requireRole('cidadao'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.aceitarRemarcacao
);
router.patch(
    '/:id/remarcacao/recusar',
    verificarToken,
    requireRole('cidadao'),
    validate(idParamSchema, 'params'),
    SolicitacaoController.recusarRemarcacao
);

router.use(tratarErroDeUpload);

module.exports = router;
