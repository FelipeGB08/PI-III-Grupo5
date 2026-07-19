const jwt = require('jsonwebtoken');
const ChatModel = require('../models/ChatModel');
const UserModel = require('../models/UserModel');
const { notificarUsuarioSemBloquear } = require('./notificationService');
const {
    chatRateLimit,
    chavePorUsuarioId,
} = require('../middlewares/rateLimitMiddleware');

function initChatSocket(io, { rateLimiter = chatRateLimit } = {}) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

            if (!token) {
                return next(new Error('Token obrigatorio.'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const usuarioAtivo = await UserModel.buscarAtivoPorId(decoded.id);
            if (!usuarioAtivo) {
                return next(new Error('Conta removida ou inativa.'));
            }
            socket.usuario = {
                id: decoded.id,
                perfil_tipo: usuarioAtivo.perfil_tipo,
            };
            return next();
        } catch (erro) {
            return next(new Error('Token invalido.'));
        }
    });

    io.on('connection', (socket) => {
        socket.on('chat:join', async ({ servico_id }) => {
            const servicoId = Number(servico_id);
            if (!servicoId) return;

            const servico = await ChatModel.buscarServicoDoUsuario(
                servicoId,
                socket.usuario.id
            );
            if (!servico) {
                socket.emit('chat:error', {
                    erro: 'Usuario sem acesso a este chat.',
                });
                return;
            }

            socket.join(`servico:${servicoId}`);
            socket.emit('chat:joined', { servico_id: servicoId });
        });

        socket.on('chat:send', async ({ servico_id, mensagem }, ack) => {
            try {
                const limite = rateLimiter.consumir(
                    chavePorUsuarioId(socket.usuario.id, socket.handshake?.address)
                );
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

                const servicoId = Number(servico_id);
                const novaMensagem = await ChatModel.criarMensagem(
                    servicoId,
                    socket.usuario.id,
                    mensagem
                );

                if (!novaMensagem) {
                    const erro = { erro: 'Mensagem invalida ou acesso negado.' };
                    if (typeof ack === 'function') ack(erro);
                    socket.emit('chat:error', erro);
                    return;
                }

                io.to(`servico:${servicoId}`).emit('chat:message', novaMensagem);
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
                if (typeof ack === 'function') ack({ mensagem: novaMensagem });
            } catch (erro) {
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
