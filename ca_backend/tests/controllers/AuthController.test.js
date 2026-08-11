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

jest.mock('../../src/services/authTokenService', () => ({
    ACCESS_TOKEN_EXPIRES_IN_SECONDS: 900,
    buscarUsuarioPorRefreshToken: jest.fn(),
    criarAccessToken: jest.fn(),
    revogarRefreshToken: jest.fn(),
}));

jest.mock('../../src/services/chatSocketRegistry', () => ({
    desconectarSocketsDaSessao: jest.fn(),
}));

const bcrypt = require('bcrypt');
const UserModel = require('../../src/models/UserModel');
const AuthController = require('../../src/controllers/AuthController');
const { montarRespostaUsuario } = require('../../src/services/authResponseService');
const {
    buscarUsuarioPorRefreshToken,
    criarAccessToken,
    revogarRefreshToken,
} = require('../../src/services/authTokenService');
const {
    desconectarSocketsDaSessao,
} = require('../../src/services/chatSocketRegistry');
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

describe('AuthController.renovarSessao', () => {
    test('nao renova uma sessao cujo refresh token ja foi revogado', async () => {
        buscarUsuarioPorRefreshToken.mockResolvedValue(null);
        const res = criarRespostaMock();

        await AuthController.renovarSessao({
            body: { refresh_token: 'r'.repeat(64) },
        }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(criarAccessToken).not.toHaveBeenCalled();
    });
});

describe('AuthController.logout', () => {
    test('revoga a sessao persistida e desconecta somente os sockets dela', async () => {
        revogarRefreshToken.mockResolvedValue({ id: 27, usuario_id: 8 });
        const res = criarRespostaMock();

        await AuthController.logout({
            body: { refresh_token: 'r'.repeat(64) },
        }, res);

        expect(revogarRefreshToken).toHaveBeenCalledWith('r'.repeat(64));
        expect(desconectarSocketsDaSessao).toHaveBeenCalledWith(
            27,
            'Sessao encerrada por logout.'
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe('AuthController.registrarUsuario', () => {
    beforeEach(() => {
        bcrypt.genSalt.mockResolvedValue('salt');
        bcrypt.hash.mockResolvedValue('senha-hash');
        UserModel.buscarPorEmail.mockResolvedValue(undefined);
        montarRespostaUsuario.mockImplementation((usuario) => usuario);
    });

    test('recusa perfil administrativo mesmo sem passar pelo middleware', async () => {
        const res = criarRespostaMock();

        await AuthController.registrarUsuario({
            body: {
                nome: 'Administrador Indevido',
                email: 'admin@exemplo.com',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'admin',
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'perfil_tipo deve ser "cidadao" ou "profissional".',
        });
        expect(UserModel.buscarPorEmail).not.toHaveBeenCalled();
        expect(UserModel.criarUsuario).not.toHaveBeenCalled();
        expect(UserModel.criarUsuarioProfissionalCompleto).not.toHaveBeenCalled();
    });

    test('mantem o cadastro publico de cidadao', async () => {
        UserModel.criarUsuario.mockResolvedValue({
            id: 11,
            nome: 'Cidadao Teste',
            perfil_tipo: 'cidadao',
        });
        const res = criarRespostaMock();

        await AuthController.registrarUsuario({
            body: {
                nome: 'Cidadao Teste',
                email: 'cidadao@exemplo.com',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'cidadao',
            },
        }, res);

        expect(UserModel.criarUsuario).toHaveBeenCalledTimes(1);
        expect(UserModel.criarUsuario.mock.calls[0][5]).toBe('cidadao');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('mantem o cadastro publico de profissional', async () => {
        UserModel.criarUsuarioProfissionalCompleto.mockResolvedValue({
            id: 12,
            nome: 'Profissional Teste',
            perfil_tipo: 'profissional',
        });
        const res = criarRespostaMock();

        await AuthController.registrarUsuario({
            body: {
                nome: 'Profissional Teste',
                email: 'profissional@exemplo.com',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'profissional',
                biografia: 'Profissional com experiencia comprovada.',
                categoria: 'Tecnologia',
            },
        }, res);

        expect(UserModel.criarUsuarioProfissionalCompleto).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'profissional@exemplo.com',
                categoriaNome: 'Tecnologia',
            })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('bloqueia variações equivalentes de um endereço Gmail já cadastrado', async () => {
        UserModel.buscarPorEmail.mockResolvedValue({ id: 10 });
        const res = criarRespostaMock();

        await AuthController.registrarUsuario({
            body: {
                nome: 'Cidadão Teste',
                email: 'Cidadao.Teste+novo@googlemail.com',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'cidadao',
            },
        }, res);

        expect(UserModel.buscarPorEmail).toHaveBeenCalledWith(
            'cidadaoteste@gmail.com'
        );
        expect(UserModel.criarUsuario).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Este email já está em uso.',
        });
    });

    test('rejeita cidades atendidas fora da regiao AMAUC', async () => {
        const res = criarRespostaMock();

        await AuthController.registrarUsuario({
            body: {
                nome: 'Profissional Teste',
                email: 'profissional-cidades@exemplo.com',
                senha: 'SenhaSegura123',
                cidade_amauc: 'Concordia',
                perfil_tipo: 'profissional',
                biografia: 'Profissional com experiencia comprovada.',
                categoria: 'Tecnologia',
                cidades_atendidas: ['Concordia', 'Cidade inexistente'],
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Todas as cidades atendidas devem pertencer a regiao AMAUC.',
        });
        expect(UserModel.criarUsuarioProfissionalCompleto).not.toHaveBeenCalled();
    });
});
