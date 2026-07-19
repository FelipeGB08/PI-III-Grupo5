jest.mock('../../src/models/ChatModel', () => ({
    criarMensagem: jest.fn(),
    buscarDestinatarioMensagem: jest.fn(),
}));

jest.mock('../../src/models/UserModel', () => ({
    buscarAtivoPorId: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

const ChatModel = require('../../src/models/ChatModel');
const { criarRateLimiter } = require('../../src/middlewares/rateLimitMiddleware');
const { initChatSocket } = require('../../src/services/chatSocketService');

describe('chatSocketService', () => {
    test('bloqueia chat:send com status 429 antes de gravar a mensagem', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        const handlers = {};
        const socket = {
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            handshake: { address: '127.0.0.1' },
            on: jest.fn((evento, handler) => {
                handlers[evento] = handler;
            }),
            emit: jest.fn(),
            join: jest.fn(),
        };
        const limiter = criarRateLimiter({ max: 1, windowMs: 60 * 1000 });
        ChatModel.criarMensagem.mockResolvedValue({
            id: 7,
            servico_id: 4,
            mensagem: 'Olá',
        });
        ChatModel.buscarDestinatarioMensagem.mockResolvedValue(99);

        initChatSocket(io, { rateLimiter: limiter });
        const aoConectar = io.on.mock.calls.find(
            ([evento]) => evento === 'connection'
        )[1];
        aoConectar(socket);

        const primeiroAck = jest.fn();
        await handlers['chat:send'](
            { servico_id: 4, mensagem: 'Olá' },
            primeiroAck
        );

        const segundoAck = jest.fn();
        await handlers['chat:send'](
            { servico_id: 4, mensagem: 'Mensagem excedente' },
            segundoAck
        );

        expect(ChatModel.criarMensagem).toHaveBeenCalledTimes(1);
        expect(segundoAck).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 429,
                retry_after: expect.any(Number),
            })
        );
        expect(socket.emit).toHaveBeenCalledWith(
            'chat:error',
            expect.objectContaining({ status: 429 })
        );
    });
});
