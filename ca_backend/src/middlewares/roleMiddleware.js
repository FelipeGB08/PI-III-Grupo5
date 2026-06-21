function requireRole(...rolesPermitidos) {
    return (req, res, next) => {
        const perfil = req.usuarioLogado?.perfil_tipo || req.usuarioLogado?.tipo_usuario;

        if (!perfil || !rolesPermitidos.includes(perfil)) {
            return res.status(403).json({ erro: 'Acesso negado para este perfil de usuario.' });
        }

        return next();
    };
}

module.exports = { requireRole };
