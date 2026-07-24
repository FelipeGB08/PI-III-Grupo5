jest.mock('../../src/models/UserModel', () => ({
    listarParaAdmin: jest.fn(),
    atualizarStatusPorAdmin: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
}));

const UserModel = require('../../src/models/UserModel');
const AdminUsuarioController = require('../../src/controllers/AdminUsuarioController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('AdminUsuarioController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('lista usuarios com filtros e metadados de paginacao', async () => {
        UserModel.listarParaAdmin.mockResolvedValue({
            items: [{ id: 12, nome: 'Maria', ativo: true }],
            total: 31,
            page: 2,
            pageSize: 20,
            totalPages: 2,
            hasMore: false,
        });
        const res = criarRespostaMock();

        await AdminUsuarioController.listar({
            validated: {
                query: {
                    page: 2,
                    pageSize: 20,
                    perfil_tipo: 'cidadao',
                    busca: 'maria',
                },
            },
        }, res);

        expect(UserModel.listarParaAdmin).toHaveBeenCalledWith({
            page: 2,
            pageSize: 20,
            perfilTipo: 'cidadao',
            busca: 'maria',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            usuarios: [{ id: 12, nome: 'Maria', ativo: true }],
            total: 31,
            page: 2,
        }));
    });

    test('admin inativa uma conta existente sem criar mecanismo paralelo', async () => {
        UserModel.atualizarStatusPorAdmin.mockResolvedValue({
            id: 12,
            nome: 'Maria',
            ativo: false,
            excluido_em: null,
        });
        const res = criarRespostaMock();

        await AdminUsuarioController.atualizarStatus({
            params: { id: '12' },
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
            validated: { body: { ativo: false } },
        }, res);

        expect(UserModel.atualizarStatusPorAdmin).toHaveBeenCalledWith({
            usuarioId: 12,
            ativo: false,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            mensagem: 'Conta inativada com sucesso.',
            usuario: expect.objectContaining({ ativo: false }),
        }));
    });

    test('nao permite que administrador altere a propria conta', async () => {
        const res = criarRespostaMock();

        await AdminUsuarioController.atualizarStatus({
            params: { id: '1' },
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
            validated: { body: { ativo: false } },
        }, res);

        expect(UserModel.atualizarStatusPorAdmin).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('nao reativa conta anonima excluida', async () => {
        UserModel.atualizarStatusPorAdmin.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await AdminUsuarioController.atualizarStatus({
            params: { id: '12' },
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
            validated: { body: { ativo: true } },
        }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            erro: expect.stringContaining('indisponivel'),
        }));
    });
});
