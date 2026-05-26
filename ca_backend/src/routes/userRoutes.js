const express = require('express');
const UserController = require('../controllers/UserController');
const verificarToken = require('../middlewares/authMiddleware'); 

const router = express.Router();

router.post('/registro', UserController.registrarUsuario);
router.post('/login', UserController.loginUsuario);

router.get('/perfil', verificarToken, (req, res) => {

    res.status(200).json({
        mensagem: 'Bem-vindo à área VIP!',
        dados_do_token: req.usuarioLogado
    });
});

module.exports = router;