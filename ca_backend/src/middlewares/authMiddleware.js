const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const verificarToken = async (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ erro: 'JWT_SECRET nao configurado no servidor.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ erro: 'Acesso negado. Token nao fornecido.' });
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({ erro: 'Token mal formatado.' });
    }

    try {
        const usuarioDecodificado = jwt.verify(partes[1], process.env.JWT_SECRET);
        const usuarioAtivo = await UserModel.buscarAtivoPorId(usuarioDecodificado.id);
        if (!usuarioAtivo) {
            return res.status(401).json({
                erro: 'Conta removida ou inativa. Faca login com outra conta.',
            });
        }
        req.usuarioLogado = {
            id: usuarioDecodificado.id,
            perfil_tipo: usuarioAtivo.perfil_tipo,
            tipo_usuario: usuarioAtivo.perfil_tipo,
        };
        return next();
    } catch (erro) {
        if (erro instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ erro: 'Token expirado. Faca login novamente.' });
        }
        return res.status(403).json({ erro: 'Token invalido.' });
    }
};

module.exports = verificarToken;
