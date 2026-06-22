const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();

router.post('/register', UserController.registrarUsuario);
router.post('/login', UserController.loginUsuario);
router.post('/social-login', UserController.loginSocial);
router.post('/magic-link', UserController.solicitarMagicLink);

module.exports = router;
