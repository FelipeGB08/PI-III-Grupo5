const express = require('express');
const errorHandler = require('../../src/middlewares/errorHandler');

describe('errorHandler', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use(express.json());
        app.post('/corpo', (req, res) => res.status(204).end());
        app.use(errorHandler);

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((erro) => (erro ? reject(erro) : resolve()));
        });
    });

    test('retorna 400 em vez de 500 para JSON malformado', async () => {
        const resposta = await fetch(`${baseUrl}/corpo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"campo":',
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'JSON malformado. Verifique a sintaxe do corpo da requisicao.',
        });
    });
});
