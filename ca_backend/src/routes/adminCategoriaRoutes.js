const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const VerificacaoController = require('../controllers/VerificacaoController');
const DenunciaController = require('../controllers/DenunciaController');
const AdminUsuarioController = require('../controllers/AdminUsuarioController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { idParamSchema } = require('../validators/commonSchemas');
const { rejeitarVerificacaoSchema } = require('../validators/verificacaoSchemas');
const {
    atualizarDenunciaSchema,
    listarDenunciasQuerySchema,
} = require('../validators/denunciaSchemas');
const {
    atualizarStatusUsuarioSchema,
    listarUsuariosAdminQuerySchema,
} = require('../validators/adminSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/admin/categorias:
 *   post:
 *     tags: [Admin, Categorias]
 *     summary: Cria uma categoria
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoriaRequest' }
 *     responses:
 *       '201':
 *         description: Categoria criada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Categoria criada!', categoria: { id: 3, nome_servico: 'Eletricista' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/categorias/{id}:
 *   put:
 *     tags: [Admin, Categorias]
 *     summary: Atualiza uma categoria
 *     description: Requer perfil `admin`.
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
 *           schema: { $ref: '#/components/schemas/CategoriaRequest' }
 *     responses:
 *       '200':
 *         description: Categoria atualizada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Categoria atualizada!', categoria: { id: 3, nome_servico: 'Eletricista' } }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   delete:
 *     tags: [Admin, Categorias]
 *     summary: Exclui uma categoria
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Categoria excluída.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Categoria excluída com sucesso!' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/verificacoes:
 *   get:
 *     tags: [Admin]
 *     summary: Lista documentos de verificacao pendentes
 *     description: Requer perfil `admin`. A lista nao expoe a URL do documento.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Verificacoes pendentes.
 *         content:
 *           application/json:
 *             example: { verificacoes: [{ perfil_id: 8, usuario_id: 12, nome: 'Ana Profissional', cidade_amauc: 'Concordia', status_verificacao: 'pendente', enviado_em: '2030-01-02T10:00:00.000Z' }] }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/verificacoes/{id}/documento:
 *   get:
 *     tags: [Admin]
 *     summary: Baixa documento privado para revisao administrativa
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200': { description: Imagem privada do documento. }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/verificacoes/{id}/aprovar:
 *   patch:
 *     tags: [Admin]
 *     summary: Aprova documento de verificacao pendente
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200': { description: Verificacao aprovada e selo publico habilitado. }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/verificacoes/{id}/rejeitar:
 *   patch:
 *     tags: [Admin]
 *     summary: Rejeita documento de verificacao pendente
 *     description: Requer perfil `admin` e motivo de rejeicao.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo_rejeicao]
 *             properties:
 *               motivo_rejeicao: { type: string, example: 'Documento ilegivel. Envie uma foto nitida.' }
 *     responses:
 *       '200': { description: Verificacao rejeitada e prestador notificado. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/denuncias:
 *   get:
 *     tags: [Admin]
 *     summary: Lista denuncias para moderacao
 *     description: Requer perfil `admin`. Pode filtrar pelo status da denuncia.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [aberta, em_analise, resolvida, arquivada] } }
 *     responses:
 *       '200': { description: Fila administrativa de denuncias. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/denuncias/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Consulta uma denuncia com o contexto do chamado
 *     description: Requer perfil `admin`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       '200': { description: Denuncia, participantes e historico relevante do chamado. }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   patch:
 *     tags: [Admin]
 *     summary: Atualiza o status ou registra a resolucao de uma denuncia
 *     description: Requer perfil `admin`. O status `resolvida` exige uma resolucao administrativa.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [aberta, em_analise, resolvida, arquivada] }
 *               resolucao_admin: { type: string, minLength: 5, maxLength: 4000 }
 *     responses:
 *       '200': { description: Denuncia atualizada. O denunciante recebe notificacao ao ser resolvida. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/usuarios:
 *   get:
 *     tags: [Admin, Usuários]
 *     summary: Lista usuarios para gestao administrativa
 *     description: Requer perfil `admin`. Permite busca por nome ou e-mail e filtro por perfil.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       - { in: query, name: perfil_tipo, schema: { type: string, enum: [cidadao, profissional, admin] } }
 *       - { in: query, name: busca, schema: { type: string, maxLength: 150 } }
 *     responses:
 *       '200':
 *         description: Pagina de usuarios administrativos.
 *         content:
 *           application/json:
 *             example: { usuarios: [{ id: 12, nome: 'Maria', email: 'maria@exemplo.com', perfil_tipo: 'cidadao', ativo: true }], total: 1, page: 1, pageSize: 20, totalPages: 1, hasMore: false }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/admin/usuarios/{id}/status:
 *   patch:
 *     tags: [Admin, Usuários]
 *     summary: Ativa ou inativa uma conta
 *     description: Requer perfil `admin`. Contas anonimizadas por exclusao nao podem ser reativadas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ativo]
 *             properties:
 *               ativo: { type: boolean, example: false }
 *     responses:
 *       '200': { description: Status da conta atualizado. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post('/categorias', verificarToken, requireRole('admin'), CategoriaController.criar);
router.put(
    '/categorias/:id',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    CategoriaController.atualizar
);
router.delete(
    '/categorias/:id',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    CategoriaController.deletar
);
router.get('/verificacoes', verificarToken, requireRole('admin'), VerificacaoController.listarPendentes);
router.get(
    '/verificacoes/:id/documento',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    VerificacaoController.baixarDocumentoAdmin
);
router.patch(
    '/verificacoes/:id/aprovar',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    VerificacaoController.aprovar
);
router.patch(
    '/verificacoes/:id/rejeitar',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    validate(rejeitarVerificacaoSchema),
    VerificacaoController.rejeitar
);
router.get(
    '/denuncias',
    verificarToken,
    requireRole('admin'),
    validate(listarDenunciasQuerySchema, 'query'),
    DenunciaController.listarParaAdmin
);
router.get(
    '/denuncias/:id',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    DenunciaController.buscarDetalheParaAdmin
);
router.patch(
    '/denuncias/:id',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    validate(atualizarDenunciaSchema),
    DenunciaController.atualizarPorAdmin
);
router.get(
    '/usuarios',
    verificarToken,
    requireRole('admin'),
    validate(listarUsuariosAdminQuerySchema, 'query'),
    AdminUsuarioController.listar
);
router.patch(
    '/usuarios/:id/status',
    verificarToken,
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    validate(atualizarStatusUsuarioSchema),
    AdminUsuarioController.atualizarStatus
);

module.exports = router;
