const express = require('express');
const UserController = require('../controllers/UserController');
const verificarToken = require('../middlewares/authMiddleware');
const {
    authRateLimit,
    cadastroRateLimit,
} = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

router.post('/register', cadastroRateLimit, UserController.registrarUsuario);
router.post('/login', authRateLimit, UserController.loginUsuario);
router.post('/social-login', authRateLimit, UserController.loginSocial);
router.post('/refresh', verificarToken, UserController.renovarSessao);
router.post('/magic-link', authRateLimit, UserController.solicitarMagicLink);
router.post('/magic-link/verify', authRateLimit, UserController.verificarMagicLink);
router.post('/password-reset/request', authRateLimit, UserController.solicitarResetSenha);
router.post('/password-reset/confirm', authRateLimit, UserController.confirmarResetSenha);

module.exports = router;
