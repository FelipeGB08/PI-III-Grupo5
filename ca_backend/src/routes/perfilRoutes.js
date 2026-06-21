const express = require('express');
const PerfilController = require('../controllers/PerfilController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/', verificarToken, requireRole('profissional'), PerfilController.criar);
router.patch('/', verificarToken, requireRole('profissional'), PerfilController.atualizarMeuPerfil);
router.get('/meu-perfil', verificarToken, requireRole('profissional'), PerfilController.buscarMeuPerfil);
router.get('/busca', verificarToken, PerfilController.listarProfissionais);

module.exports = router;
