const express = require('express');
const UserController = require('../controllers/UserController');
const verificarToken = require('../middlewares/authMiddleware'); 

const router = express.Router();

router.post('/registro', UserController.registrarUsuario);
router.post('/login', UserController.loginUsuario);

router.get('/me', verificarToken, UserController.buscarMeuPerfil);
router.patch('/me', verificarToken, UserController.atualizarMeuPerfil);

router.get('/perfil', verificarToken, UserController.buscarMeuPerfil);

module.exports = router;