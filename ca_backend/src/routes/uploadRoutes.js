const express = require('express');
const multerConfig = require('../config/multer');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Usamos o middleware do Multer esperando um campo chamado 'foto'
router.post('/', verificarToken, multerConfig.single('foto'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhuma imagem foi enviada.' });
        }

        // Essa é a URL que o aplicativo vai ler depois para mostrar a foto na tela
        const urlImagem = `/uploads/${req.file.filename}`;

        return res.status(200).json({
            mensagem: 'Upload realizado com sucesso!',
            foto_url: urlImagem
        });
    } catch (erro) {
        console.error('Erro no upload:', erro);
        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

module.exports = router;