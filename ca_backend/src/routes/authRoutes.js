const express = require('express');
const AuthController = require('../controllers/AuthController');
const SocialAuthController = require('../controllers/SocialAuthController');
const AppleAuthController = require('../controllers/AppleAuthController');
const GithubOAuthController = require('../controllers/GithubOAuthController');
const PasswordResetController = require('../controllers/PasswordResetController');
const {
    authRateLimit,
} = require('../middlewares/rateLimitMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
    cadastroPublicoMiddlewares,
    loginPublicoMiddlewares,
} = require('../middlewares/publicRegistrationMiddleware');
const {
    refreshTokenSchema,
    socialLoginSchema,
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
 * /api/auth/registro:
 *   post:
 *     tags: [Auth]
 *     summary: Alias em portugues para cadastro de usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CadastroRequest' }
 *     responses:
 *       '201':
 *         description: Usuario cadastrado.
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '429':
 *         description: Limite de tentativas de cadastro atingido.
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
 *     summary: Autentica com Google ou Apple
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
 *       '503':
 *         description: Provedor social ainda nao configurado no servidor.
 * /api/auth/apple/config:
 *   get:
 *     tags: [Auth]
 *     summary: Emite configuracao publica e contexto curto do fluxo Apple
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: true
 *         schema: { type: string, enum: [ios, android, web] }
 *     responses:
 *       '200':
 *         description: Client ID da plataforma e state/nonce vinculados por cinco minutos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [client_id, platform, state, nonce, expires_in]
 *               properties:
 *                 client_id: { type: string }
 *                 platform: { type: string, enum: [ios, android, web] }
 *                 state: { type: string, description: Contexto assinado pelo servidor. }
 *                 nonce: { type: string, description: Nonce que deve constar no identity token. }
 *                 expires_in: { type: integer, example: 300 }
 *                 redirect_uri: { type: string, format: uri, description: Presente apenas em Android e Web. }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '503':
 *         description: Fluxo Apple ainda nao configurado no servidor.
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/apple/callback:
 *   post:
 *     tags: [Auth]
 *     summary: Recebe o form_post da Apple e retorna ao aplicativo Android
 *     description: O destino do redirect e fixo no servidor e nao aceita redirect_uri do cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [code, id_token]
 *             properties:
 *               code: { type: string }
 *               id_token: { type: string }
 *               state: { type: string }
 *     responses:
 *       '303':
 *         description: Redireciona ao callback seguro do aplicativo Android.
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/github/authorize:
 *   get:
 *     tags: [Auth]
 *     summary: Inicia OAuth Authorization Code do GitHub
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: true
 *         schema: { type: string, enum: [android, ios, web] }
 *       - in: query
 *         name: cidade_amauc
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '302':
 *         description: Redireciona para a autorizacao GitHub com state assinado.
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '503':
 *         description: OAuth GitHub ainda nao configurado no servidor.
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/github/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Recebe o code do GitHub e devolve ticket de uso unico ao app
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '303':
 *         description: Redireciona para callback nativo/web controlado pelo servidor.
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '503':
 *         description: Destino OAuth GitHub ainda nao configurado no servidor.
 *       '500': { $ref: '#/components/responses/InternalError' }
 * /api/auth/github/complete:
 *   post:
 *     tags: [Auth]
 *     summary: Consome ticket OAuth GitHub e inicia a sessao local
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ticket, state]
 *             properties:
 *               ticket: { type: string }
 *               state: { type: string }
 *     responses:
 *       '200':
 *         description: Login GitHub concluido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthSession' }
 *       '400': { $ref: '#/components/responses/BadRequest' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
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
    ...cadastroPublicoMiddlewares,
    AuthController.registrarUsuario
);
router.post(
    '/registro',
    ...cadastroPublicoMiddlewares,
    AuthController.registrarUsuario
);
router.post(
    '/login',
    ...loginPublicoMiddlewares,
    AuthController.loginUsuario
);
router.post(
    '/social-login',
    authRateLimit,
    validate(socialLoginSchema),
    SocialAuthController.loginSocial
);
router.get('/github/authorize', authRateLimit, GithubOAuthController.autorizar);
router.get('/github/callback', GithubOAuthController.callback);
router.post('/github/complete', authRateLimit, GithubOAuthController.concluir);
router.get('/apple/config', AppleAuthController.configuracao);
router.post(
    '/apple/callback',
    express.urlencoded({ extended: false }),
    AppleAuthController.callbackAndroid
);
router.post(
    '/refresh',
    authRateLimit,
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
