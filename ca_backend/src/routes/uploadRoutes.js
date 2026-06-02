const express = require('express');
const fs = require('fs'); // Importa o manipulador de arquivos nativo do Node.js
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
        // Se o servidor crashar por algum motivo, deletamos a imagem que o multer 
        // tentou salvar para não gerar um arquivo órfão/corrompido no HD.
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (errFs) => {
                if (errFs) {
                    console.error('⚠️ Falha ao deletar arquivo corrompido:', errFs);
                } else {
                    console.log('🗑️ Arquivo corrompido removido da pasta uploads com sucesso.');
                }
            });
        }

        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

module.exports = router;