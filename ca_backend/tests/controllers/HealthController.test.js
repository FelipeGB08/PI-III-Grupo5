jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const { criarHealthController } = require('../../src/controllers/HealthController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('HealthController', () => {
    test('responde 200 somente quando o pool PostgreSQL está saudável', async () => {
        const pool = { query: jest.fn().mockResolvedValue({ rows: [{ healthcheck: 1 }] }) };
        const responderStatus = criarHealthController(pool);
        const req = { path: '/api/v1/status' };
        const res = criarRespostaMock();

        await responderStatus(req, res);

        expect(pool.query).toHaveBeenCalledWith('SELECT 1 AS healthcheck');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'API do Conecta Amauc rodando!',
            banco: 'disponivel',
        });
    });

    test('responde 503 quando o PostgreSQL está indisponível', async () => {
        const erroBanco = new Error('connection refused');
        const pool = { query: jest.fn().mockRejectedValue(erroBanco) };
        const responderStatus = criarHealthController(pool);
        const req = { path: '/api/status' };
        const res = criarRespostaMock();

        await responderStatus(req, res);

        expect(logger.error).toHaveBeenCalledWith(
            'Healthcheck falhou ao consultar o PostgreSQL.',
            expect.objectContaining({ erro: erroBanco, rota: '/api/status' })
        );
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ erro: 'Banco de dados indisponivel.' });
    });

    test('responde 503 quando a consulta ao PostgreSQL excede o timeout', async () => {
        const pool = { query: jest.fn(() => new Promise(() => {})) };
        const responderStatus = criarHealthController(pool, { timeoutMs: 5 });
        const req = { path: '/api/v1/status' };
        const res = criarRespostaMock();

        await responderStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Banco de dados indisponivel.',
        });
        expect(logger.error).toHaveBeenCalledWith(
            'Healthcheck falhou ao consultar o PostgreSQL.',
            expect.objectContaining({
                erro: expect.objectContaining({ code: 'HEALTHCHECK_TIMEOUT' }),
            })
        );
    });
});
