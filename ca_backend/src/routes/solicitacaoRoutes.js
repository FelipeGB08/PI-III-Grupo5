const express = require('express');
const SolicitacaoController = require('../controllers/SolicitacaoController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', verificarToken, SolicitacaoController.criarSolicitacao);
router.get('/meus-pedidos', verificarToken, SolicitacaoController.listarMeusPedidos);
router.patch('/:id/status', verificarToken, SolicitacaoController.atualizarStatus);

module.exports = router;