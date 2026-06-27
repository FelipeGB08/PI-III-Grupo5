const express = require('express');
const SolicitacaoController = require('../controllers/SolicitacaoController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', verificarToken, SolicitacaoController.criarSolicitacao);
router.get('/meus-pedidos', verificarToken, SolicitacaoController.listarMeusPedidos);
router.get('/minhas-solicitacoes', verificarToken, SolicitacaoController.listarMinhasSolicitacoes);

router.patch('/:id/status', verificarToken, SolicitacaoController.atualizarStatus);
router.patch('/:id/cancelar', verificarToken, SolicitacaoController.cancelarPeloCliente);
router.patch('/:id/remarcar', verificarToken, SolicitacaoController.solicitarRemarcacao);
router.patch('/:id/remarcacao/aceitar', verificarToken, SolicitacaoController.aceitarRemarcacao);
router.patch('/:id/remarcacao/recusar', verificarToken, SolicitacaoController.recusarRemarcacao);

module.exports = router;