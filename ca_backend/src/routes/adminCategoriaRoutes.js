const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/categorias', verificarToken, requireRole('admin'), CategoriaController.criar);
router.put('/categorias/:id', verificarToken, requireRole('admin'), CategoriaController.atualizar);
router.delete('/categorias/:id', verificarToken, requireRole('admin'), CategoriaController.deletar);

module.exports = router;
