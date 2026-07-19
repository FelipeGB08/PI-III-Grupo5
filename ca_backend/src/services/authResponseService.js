const { criarSessao } = require('./authTokenService');

function montarRespostaUsuario(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        cidade_amauc: usuario.cidade_amauc,
        endereco_principal: usuario.endereco_principal || null,
        latitude: usuario.latitude !== undefined && usuario.latitude !== null
            ? Number(usuario.latitude)
            : null,
        longitude: usuario.longitude !== undefined && usuario.longitude !== null
            ? Number(usuario.longitude)
            : null,
        perfil_tipo: usuario.perfil_tipo,
        tipo_usuario: usuario.perfil_tipo,
        foto_url: usuario.foto_url || null,
    };
}

async function criarRespostaLogin(usuario, mensagem, usuarioOverride) {
    const sessao = await criarSessao(usuario);

    return {
        mensagem,
        token: sessao.accessToken,
        access_token: sessao.accessToken,
        refresh_token: sessao.refreshToken,
        expires_in: sessao.expiresIn,
        usuario: usuarioOverride || montarRespostaUsuario(usuario),
    };
}

module.exports = {
    criarRespostaLogin,
    montarRespostaUsuario,
};
