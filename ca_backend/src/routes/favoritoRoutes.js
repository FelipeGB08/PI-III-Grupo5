const express = require('express');
const FavoritoController = require('../controllers/FavoritoController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', verificarToken, FavoritoController.listar);
router.get('/ids', verificarToken, FavoritoController.ids);
router.post('/:profissionalId', verificarToken, FavoritoController.adicionar);
router.delete('/:profissionalId', verificarToken, FavoritoController.remover);

module.exports = router;
