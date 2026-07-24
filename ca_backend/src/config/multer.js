const multer = require('multer');

module.exports = multer({
    // O arquivo fica apenas em memoria ate a assinatura binaria ser validada.
    // Nenhum nome ou extensao informado pelo cliente chega ao disco.
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
        fields: 8,
        fieldSize: 1024 * 1024,
        parts: 14,
    },
});
