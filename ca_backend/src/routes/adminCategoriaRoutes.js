const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/categorias', verificarToken, CategoriaController.criar);
router.delete('/categorias/:id', verificarToken, CategoriaController.deletar);

module.exports = router;
