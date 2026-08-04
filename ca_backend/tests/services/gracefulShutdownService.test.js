const {
    criarEncerramentoGracioso,
} = require('../../src/services/gracefulShutdownService');

describe('encerramento gracioso', () => {
    test('fecha sockets, HTTP e pool uma unica vez', async () => {
        const server = {
            listening: true,
            close: jest.fn((callback) => {
                server.listening = false;
                callback();
            }),
        };
        const io = { close: jest.fn((callback) => callback()) };
        const pool = { end: jest.fn().mockResolvedValue() };
        const logger = { info: jest.fn(), error: jest.fn() };
        const exit = jest.fn();
        const encerrar = criarEncerramentoGracioso({
            server,
            io,
            pool,
            logger,
            exit,
            timeoutMs: 5_000,
        });

        encerrar('SIGTERM');
        encerrar('SIGINT');
        await new Promise((resolve) => setImmediate(resolve));

        expect(io.close).toHaveBeenCalledTimes(1);
        expect(server.close).toHaveBeenCalledTimes(1);
        expect(pool.end).toHaveBeenCalledTimes(1);
        expect(exit).toHaveBeenCalledWith(0);
    });
});
