const express = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', CategoriaController.listar);

router.post('/admin', verificarToken, requireRole('admin'), CategoriaController.criar);
router.delete('/admin/:id', verificarToken, requireRole('admin'), CategoriaController.deletar);

module.exports = router;
