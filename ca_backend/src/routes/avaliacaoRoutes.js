const express = require('express');
const AvaliacaoController = require('../controllers/AvaliacaoController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', verificarToken, AvaliacaoController.criarAvaliacao);
router.get('/profissional/:id', AvaliacaoController.listarDoProfissional);

module.exports = router;