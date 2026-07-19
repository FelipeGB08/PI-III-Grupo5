jest.mock('../../src/models/UserModel', () => ({
    anonimizarConta: jest.fn(),
}));

const UserModel = require('../../src/models/UserModel');
const ContaController = require('../../src/controllers/ContaController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('ContaController.excluirConta', () => {
    test('rejeita exclusao sem usuario autenticado', async () => {
        const res = criarRespostaMock();

        await ContaController.excluirConta({}, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(UserModel.anonimizarConta).not.toHaveBeenCalled();
    });

    test('anonimiza a conta, revoga sessoes e confirma a exclusao', async () => {
        UserModel.anonimizarConta.mockResolvedValue({
            conta: { id: 15, ativo: false },
            refreshTokensRevogados: 3,
            arquivosParaRemover: [],
        });
        const res = criarRespostaMock();

        await ContaController.excluirConta({ usuarioLogado: { id: 15 } }, res);

        expect(UserModel.anonimizarConta).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 15,
                emailAnonimo: expect.stringMatching(/^removido-15-.+@anon\.local$/),
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Conta excluida e dados pessoais anonimizados com sucesso.',
            refresh_tokens_revogados: 3,
        });
    });

    test('informa quando a conta ja foi removida', async () => {
        UserModel.anonimizarConta.mockResolvedValue(null);
        const res = criarRespostaMock();

        await ContaController.excluirConta({ usuarioLogado: { id: 15 } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Conta nao encontrada ou ja removida.',
        });
    });
});
