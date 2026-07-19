jest.mock('bcrypt', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('../../src/models/UserModel', () => ({
    buscarPorEmail: jest.fn(),
    criarUsuario: jest.fn(),
    criarUsuarioProfissionalCompleto: jest.fn(),
}));

jest.mock('../../src/services/authResponseService', () => ({
    criarRespostaLogin: jest.fn(),
    montarRespostaUsuario: jest.fn(),
}));

const bcrypt = require('bcrypt');
const UserModel = require('../../src/models/UserModel');
const AuthController = require('../../src/controllers/AuthController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('AuthController.loginUsuario', () => {
    test('nao permite login de conta anonimizada e inativa', async () => {
        UserModel.buscarPorEmail.mockResolvedValue({
            id: 8,
            email: 'removido-8@anon.local',
            senha_hash: 'hash-antigo',
            ativo: false,
        });
        const res = criarRespostaMock();

        await AuthController.loginUsuario({
            body: { email: 'pessoa@exemplo.com', senha: 'Teste123456' },
        }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Email ou senha incorretos.',
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });
});
