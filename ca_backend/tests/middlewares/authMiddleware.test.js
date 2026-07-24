jest.mock('../../src/services/authTokenService', () => ({
    validarAccessTokenAtivo: jest.fn(),
}));

const express = require('express');
const { validarAccessTokenAtivo } = require('../../src/services/authTokenService');
const verificarToken = require('../../src/middlewares/authMiddleware');

describe('authMiddleware', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.get('/protegida', verificarToken, (req, res) => {
            res.status(200).json({ usuario_id: req.usuarioLogado.id });
        });
        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((erro) => (erro ? reject(erro) : resolve()));
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('aceita HTTP protegido enquanto a sessao e a conta estao ativas', async () => {
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 55, perfil_tipo: 'cidadao' },
            sessaoId: '7',
        });

        const resposta = await fetch(`${baseUrl}/protegida`, {
            headers: { Authorization: 'Bearer access-token-ativo' },
        });

        expect(resposta.status).toBe(200);
        await expect(resposta.json()).resolves.toEqual({ usuario_id: 55 });
    });

    test('recusa HTTP protegido apos logout, exclusao ou inativacao da conta', async () => {
        const erro = new Error('Sessao encerrada. Faca login novamente.');
        erro.codigo = 'sessao_encerrada';
        validarAccessTokenAtivo.mockRejectedValue(erro);

        const resposta = await fetch(`${baseUrl}/protegida`, {
            headers: { Authorization: 'Bearer access-token-revogado' },
        });

        expect(resposta.status).toBe(401);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Sessao encerrada. Faca login novamente.',
        });
    });
});
