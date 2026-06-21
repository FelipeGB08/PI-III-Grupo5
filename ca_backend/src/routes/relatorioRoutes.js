const express = require('express');
const RelatorioController = require('../controllers/RelatorioController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rota protegida para puxar os dados
router.get('/', verificarToken, requireRole('admin'), RelatorioController.gerarRelatorio);

module.exports = router;
