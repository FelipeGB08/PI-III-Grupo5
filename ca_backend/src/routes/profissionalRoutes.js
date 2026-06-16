const express = require('express');
const ProfissionalController = require('../controllers/ProfissionalController');

const router = express.Router();

router.get('/', ProfissionalController.listar);
router.get('/:id', ProfissionalController.buscarPorId);

module.exports = router;
