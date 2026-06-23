const express = require('express');
const AgendaController = require('../controllers/AgendaController');
const verificarToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/profissionais/:id', AgendaController.buscarPublica);
router.get('/me', verificarToken, requireRole('profissional'), AgendaController.buscarMinha);
router.put('/me', verificarToken, requireRole('profissional'), AgendaController.salvarMinha);

module.exports = router;
