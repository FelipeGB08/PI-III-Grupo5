let ioAtivo = null;

function salaDoUsuario(usuarioId) {
    return `usuario:${usuarioId}`;
}

function salaDaSessao(sessaoId) {
    return `sessao:${sessaoId}`;
}

function salaDoServico(servicoId) {
    return `servico:${servicoId}`;
}

function registrarServidorChat(io) {
    ioAtivo = io;
}

function emitirNaSalaDoServico(servicoId, evento, payload) {
    if (!ioAtivo || !servicoId || !evento) return false;

    ioAtivo.to(salaDoServico(servicoId)).emit(evento, payload);
    return true;
}

function emitirMensagemChat(servicoId, mensagem) {
    return emitirNaSalaDoServico(servicoId, 'chat:message', mensagem);
}

function emitirLeituraChat(servicoId, leitura) {
    if (!leitura) return false;
    return emitirNaSalaDoServico(servicoId, 'chat:read', leitura);
}

function desconectarSala(sala, motivo) {
    if (!ioAtivo || !sala) return false;

    const destino = ioAtivo.in(sala);
    destino.emit('auth:revoked', { erro: motivo });
    destino.disconnectSockets(true);
    return true;
}

function desconectarSocketsDaSessao(sessaoId, motivo = 'Sessao encerrada.') {
    return desconectarSala(salaDaSessao(sessaoId), motivo);
}

function desconectarSocketsDoUsuario(usuarioId, motivo = 'Conta removida ou inativa.') {
    return desconectarSala(salaDoUsuario(usuarioId), motivo);
}

module.exports = {
    desconectarSocketsDaSessao,
    desconectarSocketsDoUsuario,
    emitirLeituraChat,
    emitirMensagemChat,
    registrarServidorChat,
    salaDaSessao,
    salaDoServico,
    salaDoUsuario,
};
