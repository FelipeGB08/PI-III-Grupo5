const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', CategoriaController.listar);

router.post('/admin', verificarToken, CategoriaController.criar);
router.delete('/admin/:id', verificarToken, CategoriaController.deletar);

module.exports = router;