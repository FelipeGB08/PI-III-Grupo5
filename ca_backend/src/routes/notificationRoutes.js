const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', verificarToken, NotificationController.listar);
router.patch('/lidas', verificarToken, NotificationController.marcarTodasLidas);
router.patch('/:id/lida', verificarToken, NotificationController.marcarLida);

module.exports = router;
