const express = require('express');
const AuthController = require('../controllers/AuthController');
const SocialAuthController = require('../controllers/SocialAuthController');
const PasswordResetController = require('../controllers/PasswordResetController');
const {
    authRateLimit,
    cadastroRateLimit,
} = require('../middlewares/rateLimitMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
    cadastroSchema,
    loginSchema,
    refreshTokenSchema,
} = require('../validators/authSchemas');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastra um cidadão ou profissional
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
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica com e-mail e senha
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
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/social-login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica com Google, Apple ou GitHub
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SocialLoginRequest' }
 *     responses:
 *       '200':
 *         description: Login social realizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSession' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Emite novo access token usando refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
 *     responses:
 *       '200':
 *         description: Sessão renovada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSession' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoga um refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
 *     responses:
 *       '200':
 *         description: Logout realizado.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Logout realizado com sucesso!' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/magic-link:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita link de acesso sem senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmailRequest' }
 *     responses:
 *       '202':
 *         description: Solicitação aceita independentemente da existência do e-mail.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Se o email estiver cadastrado, enviaremos um link de acesso.' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/magic-link/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Consome um magic link e inicia uma sessão
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TokenRequest' }
 *     responses:
 *       '200':
 *         description: Login sem senha realizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSession' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/password-reset/request:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita redefinição de senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmailRequest' }
 *     responses:
 *       '202':
 *         description: Solicitação aceita independentemente da existência do e-mail.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Se o email estiver cadastrado, enviaremos instrucoes para redefinir a senha.' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/password-reset/confirm:
 *   post:
 *     tags: [Auth]
 *     summary: Confirma token e troca a senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetSenhaRequest' }
 *     responses:
 *       '200':
 *         description: Senha alterada.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Senha alterada com sucesso.' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '404': { $ref: '#/components/responses/NotFound' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post(
    '/register',
    cadastroRateLimit,
    validate(cadastroSchema),
    AuthController.registrarUsuario
);
router.post(
    '/login',
    authRateLimit,
    validate(loginSchema),
    AuthController.loginUsuario
);
router.post('/social-login', authRateLimit, SocialAuthController.loginSocial);
router.post(
    '/refresh',
    validate(refreshTokenSchema),
    AuthController.renovarSessao
);
router.post(
    '/logout',
    validate(refreshTokenSchema),
    AuthController.logout
);
router.post('/magic-link', authRateLimit, PasswordResetController.solicitarMagicLink);
router.post('/magic-link/verify', authRateLimit, PasswordResetController.verificarMagicLink);
router.post('/password-reset/request', authRateLimit, PasswordResetController.solicitarResetSenha);
router.post('/password-reset/confirm', authRateLimit, PasswordResetController.confirmarResetSenha);

module.exports = router;
