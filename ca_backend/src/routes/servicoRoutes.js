const express = require('express');
const ServicoController = require('../controllers/ServicoController');
const verificarToken = require('../middlewares/authMiddleware');
const multerConfig = require('../config/multer');

const router = express.Router();

router.post(
    '/',
    verificarToken,
    multerConfig.single('foto'),
    ServicoController.criarServico
);
router.put('/:id/status', verificarToken, ServicoController.atualizarStatus);

module.exports = router;
