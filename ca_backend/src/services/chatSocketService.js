const jwt = require('jsonwebtoken');
const ChatModel = require('../models/ChatModel');

function initChatSocket(io) {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

            if (!token) {
                return next(new Error('Token obrigatorio.'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.usuario = {
                id: decoded.id,
                perfil_tipo: decoded.perfil_tipo,
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
