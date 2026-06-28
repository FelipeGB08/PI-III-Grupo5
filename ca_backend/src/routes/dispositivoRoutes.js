const express = require('express');
const DispositivoController = require('../controllers/DispositivoController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/token', verificarToken, DispositivoController.salvarToken);
router.delete('/token', verificarToken, DispositivoController.removerToken);

module.exports = router;
