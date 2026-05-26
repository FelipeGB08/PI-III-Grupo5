const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. O Token geralmente vem no cabeçalho da requisição (Headers)
    const authHeader = req.headers.authorization;

    // 2. Se não mandou nada no cabeçalho, barra!
    if (!authHeader) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    // 3. O padrão é enviar "Bearer [TOKEN_GIGANTE]". Vamos separar só a parte do código.
    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({ erro: 'Token mal formatado.' });
    }

    const token = partes[1];

    try {
        // 4. Tenta abrir e verificar a validade do Token usando a nossa senha secreta
        const usuarioDecodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Se deu certo, gruda as informações do usuário na requisição e deixa passar!
        req.usuarioLogado = usuarioDecodificado; 
        next(); // Esse "next" é o que diz: "Pode passar para o Controller!"

    } catch (erro) {
        return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
};

module.exports = verificarToken;