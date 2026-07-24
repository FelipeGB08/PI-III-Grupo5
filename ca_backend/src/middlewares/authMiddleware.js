const { validarAccessTokenAtivo } = require('../services/authTokenService');

const verificarToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ erro: 'Acesso negado. Token nao fornecido.' });
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({ erro: 'Token mal formatado.' });
    }

    try {
        const { usuario } = await validarAccessTokenAtivo(partes[1]);
        req.usuarioLogado = {
            id: usuario.id,
            perfil_tipo: usuario.perfil_tipo,
            tipo_usuario: usuario.perfil_tipo,
        };
        return next();
    } catch (erro) {
        if (erro.codigo === 'jwt_nao_configurado') {
            return res.status(500).json({ erro: erro.message });
        }
        if (erro.codigo === 'token_expirado') {
            return res.status(401).json({ erro: 'Token expirado. Faca login novamente.' });
        }
        if (erro.codigo === 'sessao_encerrada' || erro.codigo === 'sessao_invalida') {
            return res.status(401).json({ erro: erro.message });
        }
        return res.status(403).json({ erro: 'Token invalido.' });
    }
};

module.exports = verificarToken;
