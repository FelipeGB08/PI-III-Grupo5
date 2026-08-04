jest.mock('../../src/models/CategoriaModel', () => ({
    listarTodas: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    deletar: jest.fn(),
    buscarPorNome: jest.fn(),
}));

jest.mock('../../src/models/ChatModel', () => ({
    listarConversas: jest.fn(),
    listarMensagens: jest.fn(),
    criarMensagem: jest.fn(),
    buscarDestinatarioMensagem: jest.fn(),
}));

jest.mock('../../src/models/NotificationModel', () => ({
    salvarDeviceToken: jest.fn(),
    desativarDeviceToken: jest.fn(),
    listarNotificacoes: jest.fn(),
    marcarLida: jest.fn(),
    marcarTodasLidas: jest.fn(),
}));

jest.mock('../../src/models/FavoritoModel', () => ({
    listar: jest.fn(),
    ids: jest.fn(),
    adicionar: jest.fn(),
    remover: jest.fn(),
}));

jest.mock('../../src/models/RelatorioModel', () => ({
    obterEstatisticas: jest.fn(),
}));

jest.mock('../../src/models/UserModel', () => ({
    buscarPorId: jest.fn(),
    atualizarPerfil: jest.fn(),
    buscarPorEmail: jest.fn(),
    atualizarSenha: jest.fn(),
}));

jest.mock('../../src/models/PerfilModel', () => ({
    buscarPorUsuarioId: jest.fn(),
    criarPerfil: jest.fn(),
    vincularCategoria: jest.fn(),
    atualizarPerfil: jest.fn(),
    listarTodos: jest.fn(),
}));

jest.mock('../../src/models/ServicoModel', () => ({
    criar: jest.fn(),
    atualizarStatus: jest.fn(),
}));

jest.mock('../../src/services/agendamentoValidator', () => ({
    validarAgendamento: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
    notificarUsuarioSemBloquear: jest.fn(),
}));

jest.mock('../../src/services/chatSocketRegistry', () => ({
    emitirLeituraChat: jest.fn(),
    emitirMensagemChat: jest.fn(),
}));

jest.mock('../../src/services/authResponseService', () => ({
    criarRespostaLogin: jest.fn(),
    montarRespostaUsuario: jest.fn((usuario) => ({ id: usuario.id, nome: usuario.nome })),
}));

jest.mock('../../src/services/emailService', () => ({
    enviarMagicLink: jest.fn(),
    enviarResetSenha: jest.fn(),
}));

jest.mock('../../src/services/passwordTokenStore', () => ({
    ambienteDesenvolvimento: jest.fn(),
    expiraEmMinutos: jest.fn(),
    gerarTokenSeguro: jest.fn(),
    hashToken: jest.fn((token) => `hash:${token}`),
}));
jest.mock('../../src/models/PasswordTokenModel', () => ({
    criar: jest.fn(),
    consumir: jest.fn(),
    consumirResetEAtualizarSenha: jest.fn(),
    limparExpirados: jest.fn(),
}));

jest.mock('bcrypt', () => ({ hash: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const bcrypt = require('bcrypt');
const CategoriaModel = require('../../src/models/CategoriaModel');
const ChatModel = require('../../src/models/ChatModel');
const NotificationModel = require('../../src/models/NotificationModel');
const FavoritoModel = require('../../src/models/FavoritoModel');
const RelatorioModel = require('../../src/models/RelatorioModel');
const UserModel = require('../../src/models/UserModel');
const PerfilModel = require('../../src/models/PerfilModel');
const ServicoModel = require('../../src/models/ServicoModel');
const { validarAgendamento } = require('../../src/services/agendamentoValidator');
const { notificarUsuarioSemBloquear } = require('../../src/services/notificationService');
const {
    emitirLeituraChat,
    emitirMensagemChat,
} = require('../../src/services/chatSocketRegistry');
const { criarRespostaLogin } = require('../../src/services/authResponseService');
const { enviarMagicLink, enviarResetSenha } = require('../../src/services/emailService');
const tokenStore = require('../../src/services/passwordTokenStore');
const PasswordTokenModel = require('../../src/models/PasswordTokenModel');
const CategoriaController = require('../../src/controllers/CategoriaController');
const ChatController = require('../../src/controllers/ChatController');
const DispositivoController = require('../../src/controllers/DispositivoController');
const FavoritoController = require('../../src/controllers/FavoritoController');
const NotificationController = require('../../src/controllers/NotificationController');
const RelatorioController = require('../../src/controllers/RelatorioController');
const UserController = require('../../src/controllers/UserController');
const PasswordResetController = require('../../src/controllers/PasswordResetController');
const PerfilController = require('../../src/controllers/PerfilController');
const ServicoController = require('../../src/controllers/ServicoController');
const { criarRespostaMock } = require('../helpers/httpMocks');

function resposta() {
    const res = criarRespostaMock();
    res.setHeader = jest.fn();
    return res;
}

beforeEach(() => {
    jest.clearAllMocks();
    tokenStore.ambienteDesenvolvimento.mockReturnValue(true);
    tokenStore.expiraEmMinutos.mockReturnValue(Date.now() + 60_000);
    tokenStore.gerarTokenSeguro.mockReturnValue('token-de-teste');
});

describe('controllers administrativos e de notificacao', () => {
    test('lista e administra categorias com autorizacao de admin', async () => {
        CategoriaModel.listarTodas.mockResolvedValue([{ id: 1, nome_servico: 'TI' }]);
        CategoriaModel.criar.mockResolvedValue({ id: 2, nome_servico: 'Limpeza' });
        CategoriaModel.atualizar.mockResolvedValue({ id: 2, nome_servico: 'Limpeza geral' });
        CategoriaModel.deletar.mockResolvedValue(true);

        const listarRes = resposta();
        await CategoriaController.listar({}, listarRes);
        expect(listarRes.status).toHaveBeenCalledWith(200);

        const criarRes = resposta();
        await CategoriaController.criar({
            usuarioLogado: { perfil_tipo: 'admin' },
            body: { nome_servico: 'Limpeza' },
        }, criarRes);
        expect(criarRes.status).toHaveBeenCalledWith(201);

        const atualizarRes = resposta();
        await CategoriaController.atualizar({
            usuarioLogado: { tipo_usuario: 'admin' },
            params: { id: '2' }, body: { nome: ' Limpeza geral ' },
        }, atualizarRes);
        expect(CategoriaModel.atualizar).toHaveBeenCalledWith('2', 'Limpeza geral');

        const deletarRes = resposta();
        await CategoriaController.deletar({
            usuarioLogado: { perfil_tipo: 'admin' }, params: { id: '2' },
        }, deletarRes);
        expect(deletarRes.status).toHaveBeenCalledWith(200);
    });

    test('recusa administracao de categoria por usuario comum', async () => {
        const res = resposta();
        await CategoriaController.criar({ usuarioLogado: { perfil_tipo: 'cidadao' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(CategoriaModel.criar).not.toHaveBeenCalled();
    });

    test('salva, remove e lista tokens/notificacoes do usuario autenticado', async () => {
        NotificationModel.salvarDeviceToken.mockResolvedValue({ token: 'fcm-1' });
        NotificationModel.listarNotificacoes.mockResolvedValue({ notificacoes: [], total: 0 });
        NotificationModel.marcarLida.mockResolvedValue({ id: 8, lida_em: new Date() });
        NotificationModel.marcarTodasLidas.mockResolvedValue(3);

        const salvarRes = resposta();
        await DispositivoController.salvarToken({
            usuarioLogado: { id: 4 }, body: { token: ' fcm-1 ', plataforma: 'android' },
        }, salvarRes);
        expect(NotificationModel.salvarDeviceToken).toHaveBeenCalledWith({
            usuarioId: 4, token: 'fcm-1', plataforma: 'android',
        });

        const listarRes = resposta();
        await NotificationController.listar({
            usuarioLogado: { id: 4 }, query: { page: '2', limit: '10', nao_lidas: 'true' },
        }, listarRes);
        expect(NotificationModel.listarNotificacoes).toHaveBeenCalledWith(expect.objectContaining({
            usuarioId: 4, page: 2, limit: 10, somenteNaoLidas: true,
        }));

        const lidaRes = resposta();
        await NotificationController.marcarLida({ usuarioLogado: { id: 4 }, params: { id: '8' } }, lidaRes);
        expect(lidaRes.status).toHaveBeenCalledWith(200);

        const todasRes = resposta();
        await NotificationController.marcarTodasLidas({ usuarioLogado: { id: 4 } }, todasRes);
        expect(todasRes.json).toHaveBeenCalledWith(expect.objectContaining({ atualizadas: 3 }));

        const removerRes = resposta();
        await DispositivoController.removerToken({ usuarioLogado: { id: 4 }, body: { token: 'fcm-1' } }, removerRes);
        expect(NotificationModel.desativarDeviceToken).toHaveBeenCalledWith({ usuarioId: 4, token: 'fcm-1' });
    });

    test('valida tokens de dispositivo e ids de notificacao ausentes', async () => {
        const tokenRes = resposta();
        await DispositivoController.salvarToken({ usuarioLogado: { id: 4 }, body: {} }, tokenRes);
        expect(tokenRes.status).toHaveBeenCalledWith(400);

        const notificacaoRes = resposta();
        await NotificationController.marcarLida({ usuarioLogado: { id: 4 }, params: { id: '0' } }, notificacaoRes);
        expect(notificacaoRes.status).toHaveBeenCalledWith(400);
    });

    test('protege e retorna relatorio administrativo', async () => {
        const negado = resposta();
        await RelatorioController.gerarRelatorio({ usuarioLogado: { perfil_tipo: 'cidadao' } }, negado);
        expect(negado.status).toHaveBeenCalledWith(403);

        RelatorioModel.obterEstatisticas.mockResolvedValue({ total_usuarios: 10 });
        const autorizado = resposta();
        await RelatorioController.gerarRelatorio({ usuarioLogado: { tipo_usuario: 'admin' } }, autorizado);
        expect(autorizado.json).toHaveBeenCalledWith({ total_usuarios: 10 });
    });
});

describe('ChatController e FavoritoController', () => {
    test('lista conversas e mensagens com paginacao', async () => {
        ChatModel.listarConversas.mockResolvedValue([{ servico_id: 9 }]);
        ChatModel.listarMensagens.mockResolvedValue({
            mensagens: [{ id: 5, mensagem: 'Oi' }],
            leitura: {
                servico_id: 9,
                leitor_id: 3,
                ate_mensagem_id: 5,
                lida_em: '2026-07-23T10:00:00.000Z',
            },
        });

        const conversaRes = resposta();
        await ChatController.listarConversas({ usuarioLogado: { id: 3 } }, conversaRes);
        expect(conversaRes.json).toHaveBeenCalledWith({ conversas: [{ servico_id: 9 }], total: 1 });

        const mensagensRes = resposta();
        await ChatController.listarMensagens({
            usuarioLogado: { id: 3 }, params: { id: '9' }, query: { before_id: '7', limit: '20' },
        }, mensagensRes);
        expect(ChatModel.listarMensagens).toHaveBeenCalledWith(9, 3, { beforeId: 7, limit: 20 });
        expect(emitirLeituraChat).toHaveBeenCalledWith(
            9,
            expect.objectContaining({ ate_mensagem_id: 5 })
        );
    });

    test('envia mensagem, notifica destinatario e recusa payload invalido', async () => {
        ChatModel.criarMensagem.mockResolvedValue({ id: 12, mensagem: 'Tudo certo?' });
        ChatModel.buscarDestinatarioMensagem.mockResolvedValue(8);
        const sucesso = resposta();
        await ChatController.enviarMensagem({
            usuarioLogado: { id: 3 }, params: { id: '9' }, body: { mensagem: ' Tudo certo? ' },
        }, sucesso);
        expect(sucesso.status).toHaveBeenCalledWith(201);
        expect(emitirMensagemChat).toHaveBeenCalledWith(
            9,
            expect.objectContaining({ id: 12 })
        );
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 8 }));

        const invalido = resposta();
        await ChatController.enviarMensagem({ usuarioLogado: { id: 3 }, params: { id: '0' }, body: {} }, invalido);
        expect(invalido.status).toHaveBeenCalledWith(400);
    });

    test('lista, adiciona e remove favoritos sem expor dados privados', async () => {
        FavoritoModel.listar.mockResolvedValue({
            items: [{ id: 7, nome: 'Profissional', email: 'privado@example.com' }],
            total: 1, page: 1, pageSize: 20,
        });
        FavoritoModel.ids.mockResolvedValue([7]);
        FavoritoModel.adicionar.mockResolvedValue({ usuario_id: 3, profissional_id: 7 });
        const listarRes = resposta();
        await FavoritoController.listar({ usuarioLogado: { id: 3 }, query: {} }, listarRes);
        const payload = listarRes.json.mock.calls[0][0];
        expect(payload.favoritos[0]).not.toHaveProperty('email');

        const idsRes = resposta();
        await FavoritoController.ids({ usuarioLogado: { id: 3 } }, idsRes);
        expect(idsRes.json).toHaveBeenCalledWith({ ids: [7], total: 1 });

        const adicionarRes = resposta();
        await FavoritoController.adicionar({ usuarioLogado: { id: 3 }, params: { profissionalId: '7' }, body: {} }, adicionarRes);
        expect(adicionarRes.status).toHaveBeenCalledWith(201);

        const removerRes = resposta();
        await FavoritoController.remover({ usuarioLogado: { id: 3 }, params: { profissionalId: '7' } }, removerRes);
        expect(FavoritoModel.remover).toHaveBeenCalledWith({ usuarioId: 3, profissionalId: 7 });
    });

    test('impede favoritar o proprio perfil', async () => {
        const res = resposta();
        await FavoritoController.adicionar({ usuarioLogado: { id: 3 }, params: { profissionalId: '3' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('PerfilController e UserController', () => {
    test('cria e atualiza perfil profissional com dados regionais normalizados', async () => {
        PerfilModel.buscarPorUsuarioId.mockResolvedValueOnce(null).mockResolvedValueOnce({ usuario_id: 5 });
        PerfilModel.criarPerfil.mockResolvedValue({ usuario_id: 5, biografia: 'Atendo a regiao' });
        PerfilModel.atualizarPerfil.mockResolvedValue({ usuario_id: 5, atende_rural: true });
        CategoriaModel.buscarPorNome.mockResolvedValue({ id: 2 });

        const criarRes = resposta();
        await PerfilController.criar({
            usuarioLogado: { id: 5, perfil_tipo: 'profissional' },
            body: {
                biografia: 'Atendo a regiao', categoria: 'TI', cidade_amauc: 'Concordia',
                cidades_atendidas: 'Concordia, Seara, Concordia', atende_rural: 'sim',
                portfolio_fotos: 'https://img/1.jpg,https://img/1.jpg', certificacoes: ['cert-1'],
            },
        }, criarRes);
        expect(criarRes.status).toHaveBeenCalledWith(201);
        expect(PerfilModel.vincularCategoria).toHaveBeenCalledWith(5, 2);

        const atualizarRes = resposta();
        await PerfilController.atualizarMeuPerfil({
            usuarioLogado: { id: 5, perfil_tipo: 'profissional' },
            body: { anos_experiencia: '3', atende_rural: true, taxa_deslocamento: '15.5' },
        }, atualizarRes);
        expect(atualizarRes.status).toHaveBeenCalledWith(200);
        expect(PerfilModel.atualizarPerfil).toHaveBeenCalledWith(5, expect.objectContaining({
            anos_experiencia: 3, atende_rural: true, taxa_deslocamento: 15.5,
        }));
    });

    test('busca e lista somente dados publicos de perfis profissionais', async () => {
        PerfilModel.buscarPorUsuarioId.mockResolvedValue({ usuario_id: 5, biografia: 'Bio' });
        const meuPerfilRes = resposta();
        await PerfilController.buscarMeuPerfil({ usuarioLogado: { id: 5, perfil_tipo: 'profissional' } }, meuPerfilRes);
        expect(meuPerfilRes.status).toHaveBeenCalledWith(200);

        PerfilModel.listarTodos.mockResolvedValue({
            rows: [{ id: 5, nome: 'Ana', email: 'privado@example.com', cidade_amauc: 'Concordia' }], total: 1,
        });
        const listaRes = resposta();
        await PerfilController.listarProfissionais({ query: { page: '1', limit: '10' } }, listaRes);
        expect(listaRes.json.mock.calls[0][0][0]).not.toHaveProperty('email');
        expect(listaRes.setHeader).toHaveBeenCalledWith('X-Total-Count', '1');
    });

    test('recusa campos invalidos ao atualizar usuario e retorna perfil normalizado', async () => {
        const invalido = resposta();
        await UserController.atualizarMeuPerfil({
            usuarioLogado: { id: 6 }, body: { latitude: 'nao-e-numero' },
        }, invalido);
        expect(invalido.status).toHaveBeenCalledWith(400);

        UserModel.buscarPorId.mockResolvedValue({ id: 6, nome: 'Ana' });
        const buscarRes = resposta();
        await UserController.buscarMeuPerfil({ usuarioLogado: { id: 6 } }, buscarRes);
        expect(buscarRes.json).toHaveBeenCalledWith({ id: 6, nome: 'Ana' });

        UserModel.atualizarPerfil.mockResolvedValue({ id: 6, nome: 'Ana Atualizada' });
        const atualizar = resposta();
        await UserController.atualizarMeuPerfil({
            usuarioLogado: { id: 6 }, body: { nome: ' Ana Atualizada ', latitude: '-27.2', longitude: '-52.0' },
        }, atualizar);
        expect(atualizar.status).toHaveBeenCalledWith(200);
    });
});

describe('ServicoController e PasswordResetController', () => {
    test('cria solicitacao a partir da agenda e notifica o profissional', async () => {
        UserModel.buscarPorId.mockResolvedValue({ id: 8, perfil_tipo: 'profissional' });
        validarAgendamento.mockResolvedValue({
            agenda_servico_id: 2, servico_nome: 'Visita', agendado_para: '2030-01-02T10:00:00', preco: 50, duracao_minutos: 60,
        });
        ServicoModel.criar.mockResolvedValue({ id: 10, prof_id: 8, cidadao_id: 3, servico_nome: 'Visita', status: 'pendente' });
        const res = resposta();
        await ServicoController.criarServico({
            usuarioLogado: { id: 3 }, body: { profissional_id: 8, descricao: 'Preciso de ajuda', agenda_servico_id: 2, agendado_para: '2030-01-02T10:00:00' },
        }, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(notificarUsuarioSemBloquear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 8, tipo: 'novo_chamado' }));
    });

    test('valida solicitacao e atualizacao de status legado', async () => {
        const semUsuario = resposta();
        await ServicoController.criarServico({ body: { profissional_id: 8, descricao: 'x' } }, semUsuario);
        expect(semUsuario.status).toHaveBeenCalledWith(401);

        const precoProibido = resposta();
        await ServicoController.atualizarStatus({
            usuarioLogado: { id: 8 }, params: { id: '10' }, body: { status: 'aceito', preco: 10 },
        }, precoProibido);
        expect(precoProibido.status).toHaveBeenCalledWith(400);

        ServicoModel.atualizarStatus.mockResolvedValue({ id: 10, cidadao_id: 3, status: 'aceito' });
        const sucesso = resposta();
        await ServicoController.atualizarStatus({
            usuarioLogado: { id: 8 }, params: { id: '10' }, body: { status: 'aceito' },
        }, sucesso);
        expect(sucesso.status).toHaveBeenCalledWith(200);
    });

    test('gera, consome magic link e redefine senha sem acessar banco real', async () => {
        UserModel.buscarPorEmail.mockResolvedValue({ id: 14, email: 'ana@example.com' });
        enviarMagicLink.mockResolvedValue(false);
        const solicitar = resposta();
        await PasswordResetController.solicitarMagicLink({ body: { email: ' ANA@example.com ' } }, solicitar);
        expect(solicitar.status).toHaveBeenCalledWith(202);
        expect(solicitar.json.mock.calls[0][0]).toHaveProperty('dev_token', 'token-de-teste');

        PasswordTokenModel.consumir.mockResolvedValue({ usuario_id: 14 });
        UserModel.buscarPorId.mockResolvedValue({ id: 14, ativo: true });
        criarRespostaLogin.mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' });
        const verificar = resposta();
        await PasswordResetController.verificarMagicLink({ body: { token: 'entrar' } }, verificar);
        expect(verificar.status).toHaveBeenCalledWith(200);

        bcrypt.hash.mockResolvedValue('senha-hash');
        PasswordTokenModel.consumirResetEAtualizarSenha.mockResolvedValue({ id: 14 });
        const resetar = resposta();
        await PasswordResetController.confirmarResetSenha({ body: { token: 'resetar', senha: 'NovaSenha123' } }, resetar);
        expect(resetar.status).toHaveBeenCalledWith(200);
    });

    test('retorna erro para reset sem token ou senha valida', async () => {
        const res = resposta();
        await PasswordResetController.confirmarResetSenha({ body: { token: 'x', senha: '123' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);

        enviarResetSenha.mockResolvedValue(true);
        const solicitar = resposta();
        await PasswordResetController.solicitarResetSenha({ body: { email: '' } }, solicitar);
        expect(solicitar.status).toHaveBeenCalledWith(400);
    });
});
