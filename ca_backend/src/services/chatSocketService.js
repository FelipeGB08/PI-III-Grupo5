const ChatModel = require('../models/ChatModel');
const { notificarUsuarioSemBloquear } = require('./notificationService');
const { validarAccessTokenAtivo } = require('./authTokenService');
const {
    emitirLeituraChat,
    emitirMensagemChat,
    registrarServidorChat,
    salaDaSessao,
    salaDoServico,
    salaDoUsuario,
} = require('./chatSocketRegistry');
const {
    chatRateLimit,
    chavePorUsuarioId,
} = require('../middlewares/rateLimitMiddleware');

function initChatSocket(io, { rateLimiter = chatRateLimit } = {}) {
    registrarServidorChat(io);

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

            if (!token) {
                return next(new Error('Token obrigatorio.'));
            }

            const { usuario, sessaoId } = await validarAccessTokenAtivo(token);
            socket.usuario = {
                id: usuario.id,
                perfil_tipo: usuario.perfil_tipo,
            };
            socket.sessaoId = sessaoId;
            socket.accessToken = token;
            return next();
        } catch (erro) {
            return next(new Error(erro.message || 'Token invalido.'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(salaDoUsuario(socket.usuario.id));
        socket.join(salaDaSessao(socket.sessaoId));

        const garantirSessaoAtiva = async (ack) => {
            try {
                const { usuario, sessaoId } = await validarAccessTokenAtivo(
                    socket.accessToken
                );
                socket.usuario = {
                    id: usuario.id,
                    perfil_tipo: usuario.perfil_tipo,
                };
                socket.sessaoId = sessaoId;
                return true;
            } catch (erro) {
                const payload = {
                    erro: 'Sessao encerrada. Faca login novamente.',
                    status: 401,
                };
                if (typeof ack === 'function') ack(payload);
                socket.emit('chat:error', payload);
                socket.disconnect(true);
                return false;
            }
        };

        socket.on('chat:join', async ({ servico_id } = {}, ack) => {
            try {
                if (!await garantirSessaoAtiva(ack)) return;

                const servicoId = Number(servico_id);
                if (!servicoId) {
                    const erro = { erro: 'ID do servico invalido.', status: 400 };
                    if (typeof ack === 'function') ack(erro);
                    socket.emit('chat:error', erro);
                    return;
                }

                const servico = await ChatModel.buscarServicoDoUsuario(
                    servicoId,
                    socket.usuario.id
                );
                if (!servico) {
                    const erro = {
                        erro: 'Usuario sem acesso a este chat.',
                        status: 403,
                    };
                    if (typeof ack === 'function') ack(erro);
                    socket.emit('chat:error', erro);
                    return;
                }

                socket.join(salaDoServico(servicoId));
                const leitura = await ChatModel.marcarMensagensComoLidas(
                    servicoId,
                    socket.usuario.id
                );
                if (leitura) emitirLeituraChat(servicoId, leitura);

                const payload = { servico_id: servicoId };
                socket.emit('chat:joined', payload);
                if (typeof ack === 'function') ack(payload);
            } catch (erro) {
                const payload = { erro: 'Erro interno ao entrar no chat.' };
                if (typeof ack === 'function') ack(payload);
                socket.emit('chat:error', payload);
            }
        });

        socket.on('chat:leave', ({ servico_id } = {}) => {
            const servicoId = Number(servico_id);
            if (servicoId) socket.leave(salaDoServico(servicoId));
        });

        socket.on('chat:read', async ({ servico_id } = {}, ack) => {
            try {
                if (!await garantirSessaoAtiva(ack)) return;

                const servicoId = Number(servico_id);
                const servico = servicoId && await ChatModel.buscarServicoDoUsuario(
                    servicoId,
                    socket.usuario.id
                );
                if (!servico) {
                    const erro = {
                        erro: 'Usuario sem acesso a este chat.',
                        status: 403,
                    };
                    if (typeof ack === 'function') ack(erro);
                    return;
                }

                const leitura = await ChatModel.marcarMensagensComoLidas(
                    servicoId,
                    socket.usuario.id
                );
                if (leitura) emitirLeituraChat(servicoId, leitura);
                if (typeof ack === 'function') {
                    ack({ servico_id: servicoId, leitura });
                }
            } catch (erro) {
                const payload = { erro: 'Erro interno ao confirmar leitura.' };
                if (typeof ack === 'function') ack(payload);
                socket.emit('chat:error', payload);
            }
        });

        socket.on('chat:send', async ({ servico_id, mensagem, client_id } = {}, ack) => {
            let chaveRateLimit = null;
            let consumoPermitido = false;
            try {
                if (!await garantirSessaoAtiva(ack)) return;

                chaveRateLimit = chavePorUsuarioId(
                    socket.usuario.id,
                    socket.handshake?.address
                );
                const limite = rateLimiter.consumir(chaveRateLimit);
                if (!limite.permitido) {
                    const erro = {
                        erro: 'Limite de envio de mensagens atingido. Aguarde um minuto e tente novamente.',
                        status: 429,
                        retry_after: limite.retryAfter,
                    };
                    if (typeof ack === 'function') ack(erro);
                    socket.emit('chat:error', erro);
                    return;
                }
                consumoPermitido = true;

                const servicoId = Number(servico_id);
                const novaMensagem = await ChatModel.criarMensagem(
                    servicoId,
                    socket.usuario.id,
                    mensagem,
                    client_id
                );

                if (!novaMensagem) {
                    rateLimiter.estornar(chaveRateLimit);
                    consumoPermitido = false;
                    const erro = { erro: 'Mensagem invalida ou acesso negado.' };
                    if (typeof ack === 'function') ack(erro);
                    socket.emit('chat:error', erro);
                    return;
                }

                if (novaMensagem._criada !== false) {
                    emitirMensagemChat(servicoId, novaMensagem);
                    const destinatarioId = await ChatModel.buscarDestinatarioMensagem(
                        servicoId,
                        socket.usuario.id
                    );
                    notificarUsuarioSemBloquear({
                        usuarioId: destinatarioId,
                        tipo: 'nova_mensagem_chat',
                        titulo: 'Nova mensagem no chat',
                        corpo: novaMensagem.mensagem,
                        payload: {
                            servico_id: servicoId,
                            mensagem_id: novaMensagem.id,
                        },
                    });
                }
                if (typeof ack === 'function') ack({ mensagem: novaMensagem });
            } catch (erro) {
                if (consumoPermitido && chaveRateLimit) {
                    rateLimiter.estornar(chaveRateLimit);
                }
                const payload = { erro: 'Erro interno ao enviar mensagem.' };
                if (typeof ack === 'function') ack(payload);
                socket.emit('chat:error', payload);
            }
        });
    });
}

module.exports = {
    initChatSocket,
};
