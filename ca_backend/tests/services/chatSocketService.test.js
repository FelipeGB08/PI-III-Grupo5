jest.mock('../../src/models/ChatModel', () => ({
    criarMensagem: jest.fn(),
    buscarServicoDoUsuario: jest.fn(),
    buscarDestinatarioMensagem: jest.fn(),
    marcarMensagensComoLidas: jest.fn(),
}));

jest.mock('../../src/services/authTokenService', () => ({
    validarAccessTokenAtivo: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

const ChatModel = require('../../src/models/ChatModel');
const { validarAccessTokenAtivo } = require('../../src/services/authTokenService');
const { criarRateLimiter } = require('../../src/middlewares/rateLimitMiddleware');
const { initChatSocket } = require('../../src/services/chatSocketService');

describe('chatSocketService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
        });
        ChatModel.marcarMensagensComoLidas.mockResolvedValue(null);
    });

    test('bloqueia chat:send com status 429 antes de gravar a mensagem', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        const handlers = {};
        const socket = {
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
            accessToken: 'access-token-ativo',
            handshake: { address: '127.0.0.1' },
            on: jest.fn((evento, handler) => {
                handlers[evento] = handler;
            }),
            emit: jest.fn(),
            join: jest.fn(),
            disconnect: jest.fn(),
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

    test('desconecta o socket e bloqueia chat:send se a sessao foi revogada apos o handshake', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        const handlers = {};
        const socket = {
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
            accessToken: 'access-token-revogado',
            handshake: { address: '127.0.0.1' },
            on: jest.fn((evento, handler) => {
                handlers[evento] = handler;
            }),
            emit: jest.fn(),
            join: jest.fn(),
            disconnect: jest.fn(),
        };
        const erroDeSessao = new Error('Sessao encerrada. Faca login novamente.');
        erroDeSessao.codigo = 'sessao_encerrada';

        initChatSocket(io);
        const aoConectar = io.on.mock.calls.find(
            ([evento]) => evento === 'connection'
        )[1];
        aoConectar(socket);
        validarAccessTokenAtivo.mockRejectedValue(erroDeSessao);
        const ack = jest.fn();

        await handlers['chat:send'](
            { servico_id: 4, mensagem: 'Nao deve ser enviada' },
            ack
        );

        expect(ChatModel.criarMensagem).not.toHaveBeenCalled();
        expect(ack).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
        expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    test('recusa o handshake de uma conta inativa ou sessao encerrada', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
        };
        const erroDeSessao = new Error('Sessao encerrada. Faca login novamente.');
        validarAccessTokenAtivo.mockRejectedValue(erroDeSessao);

        initChatSocket(io);
        const validarHandshake = io.use.mock.calls[0][0];
        const next = jest.fn();

        await validarHandshake({
            handshake: { auth: { token: 'access-token-revogado' } },
        }, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Sessao encerrada. Faca login novamente.',
        }));
    });

    test('recusa handshake sem token e aceita Authorization Bearer valido', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
        };
        initChatSocket(io);
        const validarHandshake = io.use.mock.calls[0][0];

        const nextSemToken = jest.fn();
        await validarHandshake({ handshake: { auth: {}, headers: {} } }, nextSemToken);
        expect(nextSemToken).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Token obrigatorio.',
        }));

        const socket = {
            handshake: {
                auth: {},
                headers: { authorization: 'Bearer token-no-header' },
            },
        };
        const nextValido = jest.fn();
        await validarHandshake(socket, nextValido);

        expect(validarAccessTokenAtivo).toHaveBeenCalledWith('token-no-header');
        expect(socket.usuario).toEqual({ id: 55, perfil_tipo: 'cidadao' });
        expect(socket.sessaoId).toBe('7');
        expect(socket.accessToken).toBe('token-no-header');
        expect(nextValido).toHaveBeenCalledWith();
    });

    test('chat:join ignora id invalido, recusa acesso e entra na sala autorizada', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        const handlers = {};
        const socket = {
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
            accessToken: 'access-token-ativo',
            handshake: { address: '127.0.0.1' },
            on: jest.fn((evento, handler) => {
                handlers[evento] = handler;
            }),
            emit: jest.fn(),
            join: jest.fn(),
            disconnect: jest.fn(),
        };

        initChatSocket(io);
        const aoConectar = io.on.mock.calls.find(
            ([evento]) => evento === 'connection'
        )[1];
        aoConectar(socket);

        await handlers['chat:join']({ servico_id: 'invalido' });
        expect(ChatModel.buscarServicoDoUsuario).not.toHaveBeenCalled();

        ChatModel.buscarServicoDoUsuario.mockResolvedValueOnce(null);
        await handlers['chat:join']({ servico_id: 12 });
        expect(socket.emit).toHaveBeenCalledWith('chat:error', expect.objectContaining({
            erro: 'Usuario sem acesso a este chat.',
        }));

        ChatModel.buscarServicoDoUsuario.mockResolvedValueOnce({ id: 12 });
        await handlers['chat:join']({ servico_id: 12 });
        expect(socket.join).toHaveBeenCalledWith('servico:12');
        expect(socket.emit).toHaveBeenCalledWith('chat:joined', {
            servico_id: 12,
        });
    });

    test('chat:read confirma leitura apenas para participante do chamado', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        const handlers = {};
        const socket = {
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
            accessToken: 'access-token-ativo',
            handshake: { address: '127.0.0.1' },
            on: jest.fn((evento, handler) => {
                handlers[evento] = handler;
            }),
            emit: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
            disconnect: jest.fn(),
        };

        initChatSocket(io);
        const aoConectar = io.on.mock.calls.find(
            ([evento]) => evento === 'connection'
        )[1];
        aoConectar(socket);

        ChatModel.buscarServicoDoUsuario.mockResolvedValueOnce({ id: 12 });
        ChatModel.marcarMensagensComoLidas.mockResolvedValueOnce({
            servico_id: 12,
            leitor_id: 55,
            ate_mensagem_id: 9,
            lida_em: '2026-07-23T10:00:00.000Z',
        });
        const ack = jest.fn();
        await handlers['chat:read']({ servico_id: 12 }, ack);

        expect(ChatModel.marcarMensagensComoLidas).toHaveBeenCalledWith(12, 55);
        expect(ack).toHaveBeenCalledWith(expect.objectContaining({
            servico_id: 12,
        }));

        ChatModel.buscarServicoDoUsuario.mockResolvedValueOnce(null);
        const ackNegado = jest.fn();
        await handlers['chat:read']({ servico_id: 99 }, ackNegado);
        expect(ackNegado).toHaveBeenCalledWith(expect.objectContaining({
            status: 403,
        }));
    });

    test('chat:send trata mensagem recusada e excecao sem depender de ack', async () => {
        const io = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        const handlers = {};
        const socket = {
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
            accessToken: 'access-token-ativo',
            handshake: { address: '127.0.0.1' },
            on: jest.fn((evento, handler) => {
                handlers[evento] = handler;
            }),
            emit: jest.fn(),
            join: jest.fn(),
            disconnect: jest.fn(),
        };

        initChatSocket(io);
        const aoConectar = io.on.mock.calls.find(
            ([evento]) => evento === 'connection'
        )[1];
        aoConectar(socket);

        const ack = jest.fn();
        ChatModel.criarMensagem.mockResolvedValueOnce(null);
        await handlers['chat:send'](
            { servico_id: 12, mensagem: 'invalida' },
            ack
        );
        expect(ack).toHaveBeenCalledWith({
            erro: 'Mensagem invalida ou acesso negado.',
        });

        ChatModel.criarMensagem.mockRejectedValueOnce(new Error('falha no banco'));
        await handlers['chat:send'](
            { servico_id: 12, mensagem: 'gera excecao' }
        );
        expect(socket.emit).toHaveBeenCalledWith('chat:error', {
            erro: 'Erro interno ao enviar mensagem.',
        });
    });
});
