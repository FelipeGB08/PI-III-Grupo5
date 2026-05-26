const express = require('express');
const RelatorioController = require('../controllers/RelatorioController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Rota protegida para puxar os dados
router.get('/', verificarToken, RelatorioController.gerarRelatorio);

module.exports = router;