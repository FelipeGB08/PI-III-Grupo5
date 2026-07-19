const express = require('express');
const PerfilController = require('../controllers/PerfilController');
const ContaController = require('../controllers/ContaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { excluirContaSchema } = require('../validators/contaSchemas');

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
 *               items: { $ref: '#/components/schemas/Profissional' }
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
 */

router.post('/', verificarToken, requireRole('profissional'), PerfilController.criar);
router.patch('/', verificarToken, requireRole('profissional'), PerfilController.atualizarMeuPerfil);
router.get('/meu-perfil', verificarToken, requireRole('profissional'), PerfilController.buscarMeuPerfil);
router.get('/busca', verificarToken, PerfilController.listarProfissionais);
router.delete('/conta', verificarToken, validate(excluirContaSchema), ContaController.excluirConta);

module.exports = router;
