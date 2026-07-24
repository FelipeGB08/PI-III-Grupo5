jest.mock('../../src/models/UserModel', () => ({
    anonimizarConta: jest.fn(),
}));

jest.mock('../../src/services/chatSocketRegistry', () => ({
    desconectarSocketsDoUsuario: jest.fn(),
}));

jest.mock('fs/promises', () => ({
    unlink: jest.fn(),
}));

const fs = require('fs/promises');
const UserModel = require('../../src/models/UserModel');
const ContaController = require('../../src/controllers/ContaController');
const {
    desconectarSocketsDoUsuario,
} = require('../../src/services/chatSocketRegistry');
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
        });
        const res = criarRespostaMock();

        await ContaController.excluirConta({ usuarioLogado: { id: 15 } }, res);

        expect(UserModel.anonimizarConta).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 15,
                emailAnonimo: expect.stringMatching(/^removido-15-.+@anon\.local$/),
            })
        );
        expect(desconectarSocketsDoUsuario).toHaveBeenCalledWith(
            15,
            'Conta removida e sessoes revogadas.'
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

    test('remove somente anexos locais validos e ignora arquivo que ja nao existe', async () => {
        fs.unlink.mockRejectedValueOnce(
            Object.assign(new Error('Arquivo ausente'), { code: 'ENOENT' })
        );
        UserModel.anonimizarConta.mockResolvedValue({
            conta: { id: 15, ativo: false },
            refreshTokensRevogados: 1,
            arquivosParaRemover: [
                '/uploads/evidencia.png',
                'https://cdn.example.com/foto.png',
                null,
            ],
        });
        const res = criarRespostaMock();

        await ContaController.excluirConta({ usuarioLogado: { id: 15 } }, res);

        expect(fs.unlink).toHaveBeenCalledTimes(1);
        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/[\\/]uploads[\\/]evidencia\.png$/)
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('registra falha ao remover anexo sem desfazer a anonimizacao', async () => {
        const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
        fs.unlink.mockRejectedValueOnce(
            Object.assign(new Error('Sem permissao'), { code: 'EACCES' })
        );
        UserModel.anonimizarConta.mockResolvedValue({
            conta: { id: 15, ativo: false },
            refreshTokensRevogados: 1,
            arquivosParaRemover: ['/uploads/evidencia.png'],
        });
        const res = criarRespostaMock();

        await ContaController.excluirConta({ usuarioLogado: { id: 15 } }, res);

        expect(aviso).toHaveBeenCalledWith(
            'Nao foi possivel remover upload de conta excluida:',
            'Sem permissao'
        );
        expect(res.status).toHaveBeenCalledWith(200);
        aviso.mockRestore();
    });

    test('retorna erro interno quando a anonimizacao falha', async () => {
        const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
        UserModel.anonimizarConta.mockRejectedValue(new Error('Falha no banco'));
        const res = criarRespostaMock();

        await ContaController.excluirConta({ usuarioLogado: { id: 15 } }, res);

        expect(desconectarSocketsDoUsuario).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Erro interno ao excluir conta.',
        });
        expect(erro).toHaveBeenCalled();
        erro.mockRestore();
    });
});
