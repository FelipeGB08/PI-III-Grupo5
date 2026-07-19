const express = require('express');
const AuthController = require('../controllers/AuthController');
const UserController = require('../controllers/UserController');
const verificarToken = require('../middlewares/authMiddleware'); 

const router = express.Router();

/**
 * @swagger
 * /api/usuarios/registro:
 *   post:
 *     tags: [Usuários]
 *     summary: Alias legado para cadastro de usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CadastroRequest' }
 *     responses:
 *       '201':
 *         description: Usuário cadastrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Usuário cadastrado com sucesso!' }
 *                 usuario: { $ref: '#/components/schemas/Usuario' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/usuarios/login:
 *   post:
 *     tags: [Usuários]
 *     summary: Alias legado para login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       '200':
 *         description: Login realizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSession' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/usuarios/me:
 *   get:
 *     tags: [Usuários]
 *     summary: Retorna o usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Dados do usuário.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 *   patch:
 *     tags: [Usuários]
 *     summary: Atualiza dados do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AtualizarUsuarioRequest' }
 *     responses:
 *       '200':
 *         description: Perfil atualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string, example: 'Perfil atualizado com sucesso!' }
 *                 usuario: { $ref: '#/components/schemas/Usuario' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/usuarios/perfil:
 *   get:
 *     tags: [Usuários]
 *     summary: Alias legado para consultar o usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Dados do usuário.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post('/registro', AuthController.registrarUsuario);
router.post('/login', AuthController.loginUsuario);

router.get('/me', verificarToken, UserController.buscarMeuPerfil);
router.patch('/me', verificarToken, UserController.atualizarMeuPerfil);

router.get('/perfil', verificarToken, UserController.buscarMeuPerfil);

module.exports = router;
