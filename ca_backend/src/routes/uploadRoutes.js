const express = require('express');
const multerConfig = require('../config/multer');
const verificarToken = require('../middlewares/authMiddleware');
const { uploadRateLimit } = require('../middlewares/rateLimitMiddleware');
const {
    comLimpezaDeUpload,
    tratarErroDeUpload,
    validarEArmazenarImagens,
} = require('../middlewares/uploadMiddleware');
const UploadClaimModel = require('../models/UploadClaimModel');

const router = express.Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Uploads]
 *     summary: Envia uma imagem
 *     description: Aceita somente JPEG, PNG ou WEBP validos pela assinatura binaria, com ate 5 MB por arquivo. Limite de 30 requisicoes por hora para cada usuario autenticado.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [foto]
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *                 description: Imagem JPEG, PNG ou WEBP de ate 5 MB.
 *     responses:
 *       '200':
 *         description: Upload realizado.
 *         content:
 *           application/json:
 *             example: { mensagem: 'Upload realizado com sucesso!', foto_url: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg' }
 *       '400':
 *         description: Arquivo ausente, invalido ou acima do limite.
 *         content:
 *           application/json:
 *             example: { erro: 'Arquivo invalido. Envie uma imagem JPEG, PNG ou WEBP valida.' }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '429': { $ref: '#/components/responses/TooManyRequests' }
 *       '500': { $ref: '#/components/responses/InternalError' }
 */

router.post(
    '/',
    verificarToken,
    uploadRateLimit,
    multerConfig.single('foto'),
    validarEArmazenarImagens,
    comLimpezaDeUpload(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhuma imagem foi enviada.' });
        }

        await UploadClaimModel.registrar({
            usuarioId: req.usuarioLogado.id,
            caminho: req.file.url,
        });

        return res.status(200).json({
            mensagem: 'Upload realizado com sucesso!',
            foto_url: req.file.url,
        });
    })
);

router.use(tratarErroDeUpload);

module.exports = router;
