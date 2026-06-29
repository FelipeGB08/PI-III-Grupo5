const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs'); // Módulo nativo do Node para mexer nos arquivos do sistema

// Caminho absoluto para a pasta uploads (na raiz do projeto)
const pastaUploads = path.resolve(__dirname, '..', '..', 'uploads');

// O pulo do gato: Se a pasta não existir, o Node.js cria ela na hora!
if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaUploads);
    },
    filename: (req, file, cb) => {
        const hash = crypto.randomBytes(16).toString('hex');
        // Usamos um replace aqui só para tirar espaços do nome original do arquivo e evitar bugs
        const nomeLimpo = file.originalname.replace(/\s+/g, '_'); 
        const filename = `${hash}-${nomeLimpo}`;
        cb(null, filename);
    }
});

const tiposPermitidos = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
]);

module.exports = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
    },
    fileFilter: (req, file, cb) => {
        if (!tiposPermitidos.has(file.mimetype)) {
            return cb(new Error('Tipo de arquivo nao permitido. Envie JPG, PNG, WEBP ou HEIC.'));
        }
        cb(null, true);
    },
});
