jest.mock('fs/promises', () => ({
    unlink: jest.fn(),
}));

jest.mock('../../src/models/PerfilModel', () => ({
    buscarVerificacaoPorUsuarioId: jest.fn(),
    buscarVerificacaoPorPerfilId: jest.fn(),
    enviarDocumentoVerificacao: jest.fn(),
    listarVerificacoesPendentes: jest.fn(),
    aprovarVerificacao: jest.fn(),
    rejeitarVerificacao: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
}));

const fs = require('fs/promises');
const PerfilModel = require('../../src/models/PerfilModel');
const { notificarUsuarioSemBloquear } = require('../../src/services/notificationService');
const VerificacaoController = require('../../src/controllers/VerificacaoController');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('VerificacaoController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('prestador envia documento e a verificacao fica pendente sem expor a referencia privada', async () => {
        PerfilModel.buscarVerificacaoPorUsuarioId.mockResolvedValue({
            perfil_id: 8,
            documento_url: 'verificacoes/documento-antigo.jpg',
        });
        PerfilModel.enviarDocumentoVerificacao.mockResolvedValue({
            perfil_id: 8,
            usuario_id: 12,
            status_verificacao: 'pendente',
            documento_url: 'verificacoes/documento-novo.png',
            enviado_em: '2030-01-02T10:00:00.000Z',
        });
        const res = criarRespostaMock();

        await VerificacaoController.enviarDocumento({
            usuarioLogado: { id: 12, perfil_tipo: 'profissional' },
            file: {
                url: 'verificacoes/documento-novo.png',
                path: 'C:/private_uploads/verificacoes/documento-novo.png',
            },
        }, res);

        expect(PerfilModel.enviarDocumentoVerificacao).toHaveBeenCalledWith(
            12,
            'verificacoes/documento-novo.png'
        );
        expect(fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/documento-antigo\.jpg$/));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Documento enviado para revisao administrativa.',
            verificacao: expect.objectContaining({
                perfil_id: 8,
                status_verificacao: 'pendente',
                documento_disponivel: true,
            }),
        });
        expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('documento-novo.png');
    });

    test('admin aprova e notifica o prestador', async () => {
        PerfilModel.aprovarVerificacao.mockResolvedValue({
            perfil_id: 8,
            usuario_id: 12,
            status_verificacao: 'aprovado',
            enviado_em: '2030-01-02T10:00:00.000Z',
            revisado_em: '2030-01-03T10:00:00.000Z',
        });
        const res = criarRespostaMock();

        await VerificacaoController.aprovar({
            params: { id: '8' },
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
        }, res);

        expect(PerfilModel.aprovarVerificacao).toHaveBeenCalledWith(8, 1);
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'verificacao_aprovada',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            verificacao: expect.objectContaining({
                status_verificacao: 'aprovado',
            }),
        }));
    });

    test('admin rejeita com motivo e notifica o prestador', async () => {
        PerfilModel.rejeitarVerificacao.mockResolvedValue({
            perfil_id: 8,
            usuario_id: 12,
            status_verificacao: 'rejeitado',
            motivo_rejeicao: 'Documento ilegivel.',
        });
        const res = criarRespostaMock();

        await VerificacaoController.rejeitar({
            params: { id: '8' },
            usuarioLogado: { id: 1, perfil_tipo: 'admin' },
            body: { motivo_rejeicao: 'Documento ilegivel.' },
        }, res);

        expect(PerfilModel.rejeitarVerificacao).toHaveBeenCalledWith(
            8,
            1,
            'Documento ilegivel.'
        );
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(
            expect.objectContaining({
                usuarioId: 12,
                tipo: 'verificacao_rejeitada',
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            verificacao: expect.objectContaining({
                motivo_rejeicao: 'Documento ilegivel.',
            }),
        }));
    });

    test('usuario nao consegue forcar acesso a documento de outro prestador', async () => {
        PerfilModel.buscarVerificacaoPorUsuarioId.mockResolvedValue(undefined);
        const res = criarRespostaMock();
        res.sendFile = jest.fn();
        const next = jest.fn();

        await VerificacaoController.baixarMeuDocumento({
            usuarioLogado: { id: 77, perfil_tipo: 'profissional' },
            params: { id: '8' },
        }, res, next);

        expect(PerfilModel.buscarVerificacaoPorUsuarioId).toHaveBeenCalledWith(77);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.sendFile).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    test('exige autenticacao, arquivo e perfil profissional ao enviar documento', async () => {
        const semAutenticacao = criarRespostaMock();
        await VerificacaoController.enviarDocumento({ file: { url: 'verificacoes/a.png' } }, semAutenticacao);
        expect(semAutenticacao.status).toHaveBeenCalledWith(401);

        const semArquivo = criarRespostaMock();
        await VerificacaoController.enviarDocumento({ usuarioLogado: { id: 12 } }, semArquivo);
        expect(semArquivo.status).toHaveBeenCalledWith(400);

        PerfilModel.buscarVerificacaoPorUsuarioId.mockResolvedValue(undefined);
        const semPerfil = criarRespostaMock();
        await VerificacaoController.enviarDocumento({
            usuarioLogado: { id: 12 },
            file: { url: 'verificacoes/a.png' },
        }, semPerfil);
        expect(semPerfil.status).toHaveBeenCalledWith(404);
    });

    test('consulta o status sem expor a referencia privada do documento', async () => {
        PerfilModel.buscarVerificacaoPorUsuarioId.mockResolvedValue({
            perfil_id: 8,
            status_verificacao: 'rejeitado',
            documento_url: 'verificacoes/documento-privado.webp',
            motivo_rejeicao: 'Envie uma foto mais nitida.',
        });
        const res = criarRespostaMock();

        await VerificacaoController.buscarMinhaVerificacao({ usuarioLogado: { id: 12 } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('documento-privado.webp');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            verificacao: expect.objectContaining({
                documento_disponivel: true,
                motivo_rejeicao: 'Envie uma foto mais nitida.',
            }),
        }));
    });

    test('admin lista somente metadados das verificacoes pendentes', async () => {
        PerfilModel.listarVerificacoesPendentes.mockResolvedValue([
            { perfil_id: 8, nome: 'Prestador', status_verificacao: 'pendente' },
        ]);
        const res = criarRespostaMock();

        await VerificacaoController.listarPendentes({}, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            verificacoes: [{ perfil_id: 8, nome: 'Prestador', status_verificacao: 'pendente' }],
        });
    });

    test('retorna 404 quando a revisao pendente ja nao existe', async () => {
        PerfilModel.aprovarVerificacao.mockResolvedValue(undefined);
        PerfilModel.rejeitarVerificacao.mockResolvedValue(undefined);
        const aprovarRes = criarRespostaMock();
        const rejeitarRes = criarRespostaMock();

        await VerificacaoController.aprovar({ params: { id: '8' }, usuarioLogado: { id: 1 } }, aprovarRes);
        await VerificacaoController.rejeitar({
            params: { id: '8' },
            usuarioLogado: { id: 1 },
            body: { motivo_rejeicao: 'Documento ilegivel.' },
        }, rejeitarRes);

        expect(aprovarRes.status).toHaveBeenCalledWith(404);
        expect(rejeitarRes.status).toHaveBeenCalledWith(404);
    });

    test('delegada a entrega do documento apenas apos consultar o documento do proprio usuario', async () => {
        PerfilModel.buscarVerificacaoPorUsuarioId.mockResolvedValue({
            documento_url: 'verificacoes/arquivo-seguro.jpg',
        });
        const res = criarRespostaMock();
        res.set = jest.fn();
        res.sendFile = jest.fn((arquivo, opcoes, callback) => callback());
        const next = jest.fn();

        await VerificacaoController.baixarMeuDocumento({ usuarioLogado: { id: 12 } }, res, next);

        expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
        expect(res.sendFile).toHaveBeenCalledWith(
            'arquivo-seguro.jpg',
            expect.objectContaining({ root: expect.stringContaining('private_uploads') }),
            expect.any(Function)
        );
        expect(next).not.toHaveBeenCalled();
    });
});
