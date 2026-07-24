const express = require('express');

jest.mock('../../src/services/authTokenService', () => ({
    validarAccessTokenAtivo: jest.fn(),
}));

jest.mock('../../src/models/AvaliacaoModel', () => ({
    buscarPorServico: jest.fn(),
    buscarPorProfissional: jest.fn(),
    calcularMedia: jest.fn(),
    criar: jest.fn(),
}));

jest.mock('../../src/models/ServicoModel', () => ({
    buscarPorId: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

const {
    validarAccessTokenAtivo,
} = require('../../src/services/authTokenService');
const AvaliacaoModel = require('../../src/models/AvaliacaoModel');
const ServicoModel = require('../../src/models/ServicoModel');
const avaliacaoRoutes = require('../../src/routes/avaliacaoRoutes');

describe('validacao das rotas de avaliacao', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use(express.json());
        app.use('/api/avaliacoes', avaliacaoRoutes);
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

    beforeEach(() => {
        jest.clearAllMocks();
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 12, perfil_tipo: 'cidadao' },
            sessaoId: '8',
        });
    });

    test('rejeita nota decimal antes de consultar os models', async () => {
        const resposta = await fetch(`${baseUrl}/api/avaliacoes`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer token-valido',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ servico_id: 44, nota_estrelas: 4.5 }),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'A nota deve ser um numero inteiro entre 1 e 5.',
        });
        expect(ServicoModel.buscarPorId).not.toHaveBeenCalled();
        expect(AvaliacaoModel.criar).not.toHaveBeenCalled();
    });

    test('rejeita page invalida na listagem paginada', async () => {
        const resposta = await fetch(
            `${baseUrl}/api/avaliacoes/profissional/9?page=0&pageSize=20`
        );

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'page deve ser maior ou igual a 1.',
        });
        expect(AvaliacaoModel.buscarPorProfissional).not.toHaveBeenCalled();
    });
});
