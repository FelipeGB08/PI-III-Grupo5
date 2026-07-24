jest.mock('../../src/models/DenunciaModel', () => ({
    criar: jest.fn(),
    listarParaAdmin: jest.fn(),
    buscarDetalheParaAdmin: jest.fn(),
    atualizarPorAdmin: jest.fn(),
}));

jest.mock('../../src/models/UserModel', () => ({
    listarAdministradoresAtivos: jest.fn(),
}));

jest.mock('../../src/services/emailService', () => ({
    enviarAlertaDenunciaAdmin: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
}));

const DenunciaModel = require('../../src/models/DenunciaModel');
const UserModel = require('../../src/models/UserModel');
const { enviarAlertaDenunciaAdmin } = require('../../src/services/emailService');
const { notificarUsuarioSemBloquear } = require('../../src/services/notificationService');
const DenunciaController = require('../../src/controllers/DenunciaController');
const { criarRespostaMock } = require('../helpers/httpMocks');

const proximoTick = () => new Promise((resolve) => setImmediate(resolve));

describe('DenunciaController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        UserModel.listarAdministradoresAtivos.mockResolvedValue([]);
    });

    test('registra denuncia somente quando o model confirma participacao no chamado', async () => {
        DenunciaModel.criar.mockResolvedValue({
            id: 30,
            servico_solicitado_id: 44,
            denunciante_id: 12,
            motivo: 'cobranca_indevida',
            status: 'aberta',
        });
        UserModel.listarAdministradoresAtivos.mockResolvedValue([
            { id: 1, email: 'admin@amauc.test' },
        ]);
        const res = criarRespostaMock();

        await DenunciaController.criar({
            params: { id: '44' },
            usuarioLogado: { id: 12, perfil_tipo: 'cidadao' },
            validated: {
                body: {
                    motivo: 'cobranca_indevida',
                    descricao: 'Foi cobrado um valor diferente do combinado.',
                },
            },
        }, res);
        await proximoTick();

        expect(DenunciaModel.criar).toHaveBeenCalledWith({
            servicoSolicitadoId: 44,
            denuncianteId: 12,
            motivo: 'cobranca_indevida',
            descricao: 'Foi cobrado um valor diferente do combinado.',
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(enviarAlertaDenunciaAdmin).toHaveBeenCalledWith(expect.objectContaining({
            denunciaId: 30,
            servicoId: 44,
            to: 'admin@amauc.test',
        }));
    });

    test('nao permite denunciar chamado alheio nem revela se ele existe', async () => {
        DenunciaModel.criar.mockResolvedValue(undefined);
        const res = criarRespostaMock();

        await DenunciaController.criar({
            params: { id: '99' },
            usuarioLogado: { id: 88, perfil_tipo: 'profissional' },
            body: {
                motivo: 'outro',
                descricao: 'Descricao com detalhes suficientes.',
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            erro: expect.stringContaining('nao participa'),
        }));
        expect(enviarAlertaDenunciaAdmin).not.toHaveBeenCalled();
    });

    test('admin lista denuncias com filtro de status e consulta contexto do chamado', async () => {
        DenunciaModel.listarParaAdmin.mockResolvedValue([{ id: 30, status: 'aberta' }]);
        DenunciaModel.buscarDetalheParaAdmin.mockResolvedValue({
            id: 30,
            servico: { id: 44, status: 'aceito', cliente: { id: 12 } },
        });
        const listaRes = criarRespostaMock();
        const detalheRes = criarRespostaMock();

        await DenunciaController.listarParaAdmin({
            validated: { query: { status: 'aberta' } },
        }, listaRes);
        await DenunciaController.buscarDetalheParaAdmin({ params: { id: '30' } }, detalheRes);

        expect(DenunciaModel.listarParaAdmin).toHaveBeenCalledWith('aberta');
        expect(listaRes.json).toHaveBeenCalledWith({ denuncias: [{ id: 30, status: 'aberta' }] });
        expect(DenunciaModel.buscarDetalheParaAdmin).toHaveBeenCalledWith(30);
        expect(detalheRes.json).toHaveBeenCalledWith(expect.objectContaining({
            denuncia: expect.objectContaining({ servico: expect.objectContaining({ id: 44 }) }),
        }));
    });

    test('admin resolve denuncia e notifica somente o denunciante', async () => {
        DenunciaModel.atualizarPorAdmin.mockResolvedValue({
            id: 30,
            servico_solicitado_id: 44,
            denunciante_id: 12,
            status_anterior: 'em_analise',
            status: 'resolvida',
            resolucao_admin: 'O valor foi revisto pela administracao.',
        });
        const res = criarRespostaMock();

        await DenunciaController.atualizarPorAdmin({
            params: { id: '30' },
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
            body: {
                status: 'resolvida',
                resolucao_admin: 'O valor foi revisto pela administracao.',
            },
        }, res);

        expect(DenunciaModel.atualizarPorAdmin).toHaveBeenCalledWith({
            denunciaId: 30,
            adminId: 1,
            status: 'resolvida',
            resolucaoAdmin: 'O valor foi revisto pela administracao.',
        });
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(expect.objectContaining({
            usuarioId: 12,
            tipo: 'denuncia_resolvida',
        }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('nao envia segunda notificacao ao editar uma denuncia ja resolvida', async () => {
        DenunciaModel.atualizarPorAdmin.mockResolvedValue({
            id: 30,
            denunciante_id: 12,
            status_anterior: 'resolvida',
            status: 'resolvida',
        });
        const res = criarRespostaMock();

        await DenunciaController.atualizarPorAdmin({
            params: { id: '30' },
            usuarioLogado: { id: 1 },
            body: { status: 'resolvida', resolucao_admin: 'Resolvido novamente.' },
        }, res);

        expect(notificarUsuarioSemBloquear).not.toHaveBeenCalled();
    });
});
