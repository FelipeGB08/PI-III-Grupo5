const express = require('express');
const SolicitacaoController = require('../controllers/SolicitacaoController');
const ChatController = require('../controllers/ChatController');
const verificarToken = require('../middlewares/authMiddleware');
const multerConfig = require('../config/multer');

const router = express.Router();

router.post('/', verificarToken, SolicitacaoController.criarSolicitacao);
router.get('/meus-pedidos', verificarToken, SolicitacaoController.listarMeusPedidos);
router.get('/minhas-solicitacoes', verificarToken, SolicitacaoController.listarMinhasSolicitacoes);
router.get('/:id/mensagens', verificarToken, ChatController.listarMensagens);
router.post('/:id/mensagens', verificarToken, ChatController.enviarMensagem);

router.post(
    '/:id/fotos-conclusao',
    verificarToken,
    multerConfig.array('fotos', 5),
    SolicitacaoController.uploadFotosConclusao
);
router.patch('/:id/status', verificarToken, SolicitacaoController.atualizarStatus);
router.patch('/:id/cancelar', verificarToken, SolicitacaoController.cancelarPeloCliente);
router.patch('/:id/remarcar', verificarToken, SolicitacaoController.solicitarRemarcacao);
router.patch('/:id/remarcacao/aceitar', verificarToken, SolicitacaoController.aceitarRemarcacao);
router.patch('/:id/remarcacao/recusar', verificarToken, SolicitacaoController.recusarRemarcacao);

module.exports = router;
