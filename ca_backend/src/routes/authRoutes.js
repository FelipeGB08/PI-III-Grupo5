const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();

router.post('/register', UserController.registrarUsuario);
router.post('/login', UserController.loginUsuario);

module.exports = router;
