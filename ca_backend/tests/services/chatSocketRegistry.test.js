const {
    desconectarSocketsDaSessao,
    desconectarSocketsDoUsuario,
    registrarServidorChat,
} = require('../../src/services/chatSocketRegistry');

describe('chatSocketRegistry', () => {
    test('desconecta sockets da sessao encerrada por logout', () => {
        const destino = {
            emit: jest.fn(),
            disconnectSockets: jest.fn(),
        };
        const io = { in: jest.fn(() => destino) };
        registrarServidorChat(io);

        expect(
            desconectarSocketsDaSessao(27, 'Sessao encerrada por logout.')
        ).toBe(true);
        expect(io.in).toHaveBeenCalledWith('sessao:27');
        expect(destino.emit).toHaveBeenCalledWith('auth:revoked', {
            erro: 'Sessao encerrada por logout.',
        });
        expect(destino.disconnectSockets).toHaveBeenCalledWith(true);
    });

    test('desconecta todas as sessoes do usuario ao excluir a conta', () => {
        const destino = {
            emit: jest.fn(),
            disconnectSockets: jest.fn(),
        };
        const io = { in: jest.fn(() => destino) };
        registrarServidorChat(io);

        desconectarSocketsDoUsuario(15, 'Conta removida e sessoes revogadas.');

        expect(io.in).toHaveBeenCalledWith('usuario:15');
        expect(destino.disconnectSockets).toHaveBeenCalledWith(true);
    });
});
