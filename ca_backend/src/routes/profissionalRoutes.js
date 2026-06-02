const express = require('express');
const ProfissionalController = require('../controllers/ProfissionalController');

const router = express.Router();

// A busca é pública para o cidadão ver quem está perto
router.get('/', ProfissionalController.listar);

module.exports = router;