const express = require('express');
const PerfilController = require('../controllers/PerfilController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', verificarToken, PerfilController.criar);
router.get('/meu-perfil', verificarToken, PerfilController.buscarMeuPerfil);
router.get('/busca', verificarToken, PerfilController.listarProfissionais);

module.exports = router;