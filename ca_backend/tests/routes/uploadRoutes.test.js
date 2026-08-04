const fs = require('fs/promises');
const path = require('path');

const pastaUploadsTeste = path.resolve(__dirname, '..', '.tmp-secure-uploads');
process.env.UPLOADS_DIR = pastaUploadsTeste;

jest.mock('../../src/services/authTokenService', () => ({
    validarAccessTokenAtivo: jest.fn(),
}));
jest.mock('../../src/models/UploadClaimModel', () => ({
    registrar: jest.fn().mockResolvedValue({ id: 1 }),
}));

jest.mock('../../src/controllers/SolicitacaoController', () => ({
    aceitarPropostaValor: jest.fn(),
    atualizarStatus: jest.fn(),
    buscarFinanceiro: jest.fn(),
    buscarPorId: jest.fn(),
    cancelarPeloCliente: jest.fn(),
    criarSolicitacao: jest.fn(),
    listarMeusPedidos: jest.fn(),
    listarMinhasSolicitacoes: jest.fn(),
    proporValor: jest.fn(),
    recusarPropostaValor: jest.fn(),
    solicitarRemarcacao: jest.fn(),
    aceitarRemarcacao: jest.fn(),
    recusarRemarcacao: jest.fn(),
    confirmarConclusao: jest.fn(),
    uploadFotosConclusao: jest.fn((req, res) => {
        res.status(500).json({ erro: 'Falha simulada ao salvar evidencias.' });
    }),
}));

jest.mock('../../src/controllers/ServicoController', () => ({
    criarServico: jest.fn((req, res) => {
        res.status(201).json({ mensagem: 'Solicitacao criada com sucesso.' });
    }),
    atualizarStatus: jest.fn(),
}));

const express = require('express');
const {
    validarAccessTokenAtivo,
} = require('../../src/services/authTokenService');
const ServicoController = require('../../src/controllers/ServicoController');
const {
    solicitacaoRateLimit,
    uploadRateLimit,
} = require('../../src/middlewares/rateLimitMiddleware');
const uploadRoutes = require('../../src/routes/uploadRoutes');
const servicoRoutes = require('../../src/routes/servicoRoutes');
const solicitacaoRoutes = require('../../src/routes/solicitacaoRoutes');

const pngValido = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
    0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 240,
    31, 0, 5, 0, 1, 255, 114, 156, 82, 103, 0, 0, 0, 0, 73, 69,
    78, 68, 174, 66, 96, 130,
]);

function formularioComArquivo(campo, conteudo, nome, tipo = 'image/png') {
    const form = new FormData();
    form.append(campo, new Blob([conteudo], { type: tipo }), nome);
    return form;
}

async function arquivosPersistidos() {
    return fs.readdir(pastaUploadsTeste);
}

describe('rotas de upload seguro', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use('/api/upload', uploadRoutes);
        app.use('/api/servicos', servicoRoutes);
        app.use('/api/solicitacoes', solicitacaoRoutes);
        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', resolve);
        });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    beforeEach(async () => {
        await fs.rm(pastaUploadsTeste, { recursive: true, force: true });
        await fs.mkdir(pastaUploadsTeste, { recursive: true });
        jest.clearAllMocks();
        solicitacaoRateLimit.resetar();
        uploadRateLimit.resetar();
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 9, perfil_tipo: 'profissional' },
            sessaoId: '7',
        });
    });

    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((erro) => (erro ? reject(erro) : resolve()));
        });
        await fs.rm(pastaUploadsTeste, { recursive: true, force: true });
        delete process.env.UPLOADS_DIR;
    });

    test('rejeita texto disfarçado de JPEG mesmo com mimetype image/jpeg', async () => {
        const resposta = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: formularioComArquivo('foto', 'nao sou uma imagem', 'foto.jpg'),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Arquivo invalido. Envie uma imagem JPEG, PNG ou WEBP valida.',
        });
        await expect(arquivosPersistidos()).resolves.toEqual([]);
    });

    test('rejeita nome com extensao executavel e nao deixa arquivo no diretorio', async () => {
        const resposta = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: formularioComArquivo('foto', pngValido, 'evidencia.png.exe'),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Nome de arquivo com extensao nao permitida.',
        });
        await expect(arquivosPersistidos()).resolves.toEqual([]);
    });

    test('rejeita extensao executavel escondida antes da extensao da imagem', async () => {
        const resposta = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: formularioComArquivo('foto', pngValido, 'evidencia.exe.png'),
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Nome de arquivo com extensao nao permitida.',
        });
        await expect(arquivosPersistidos()).resolves.toEqual([]);
    });

    test('nao processa nem persiste arquivo quando o usuario nao esta autorizado', async () => {
        const erro = new Error('Token invalido.');
        erro.codigo = 'token_invalido';
        validarAccessTokenAtivo.mockRejectedValue(erro);

        const resposta = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-invalido' },
            body: formularioComArquivo('foto', pngValido, 'foto.png'),
        });

        expect(resposta.status).toBe(403);
        await expect(arquivosPersistidos()).resolves.toEqual([]);
    });

    test('gera URL relativa padronizada e nome aleatorio sem usar o nome original', async () => {
        const resposta = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: formularioComArquivo('foto', pngValido, 'foto da casa.png'),
        });
        const corpo = await resposta.json();

        expect(resposta.status).toBe(200);
        expect(corpo.foto_url).toMatch(
            /^\/uploads\/[0-9a-f-]{36}\.png$/
        );
        expect(corpo.foto_url).not.toContain('foto');
        await expect(
            fs.stat(path.join(pastaUploadsTeste, path.basename(corpo.foto_url)))
        ).resolves.toMatchObject({ isFile: expect.any(Function) });
    });

    test('remove evidencias ja persistidas se o controller retornar erro', async () => {
        const resposta = await fetch(`${baseUrl}/api/solicitacoes/44/fotos-conclusao`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: formularioComArquivo('fotos', pngValido, 'evidencia.png'),
        });

        expect(resposta.status).toBe(500);
        await expect(arquivosPersistidos()).resolves.toEqual([]);
    });

    test('rota legada de servico rejeita o mesmo agendamento passado antes do controller', async () => {
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 9, perfil_tipo: 'cidadao' },
            sessaoId: '7',
        });
        const form = new FormData();
        form.append('prof_id', '8');
        form.append('agenda_servico_id', '3');
        form.append('descricao', 'Servico residencial');
        form.append('agendado_para', '2000-01-01T10:00:00.000Z');

        const resposta = await fetch(`${baseUrl}/api/servicos`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: form,
        });

        expect(resposta.status).toBe(400);
        await expect(resposta.json()).resolves.toEqual({
            erro: 'Nao e permitido agendar em horario passado.',
        });
        expect(ServicoController.criarServico).not.toHaveBeenCalled();
        await expect(arquivosPersistidos()).resolves.toEqual([]);
    });

    test('rota legada de servico continua aceitando cadastro normal de solicitacao', async () => {
        validarAccessTokenAtivo.mockResolvedValue({
            usuario: { id: 9, perfil_tipo: 'cidadao' },
            sessaoId: '7',
        });
        const form = new FormData();
        form.append('prof_id', '8');
        form.append('agenda_servico_id', '3');
        form.append('descricao', 'Servico residencial');
        form.append('agendado_para', '2099-01-01T10:00:00.000Z');

        const resposta = await fetch(`${baseUrl}/api/servicos`, {
            method: 'POST',
            headers: { Authorization: 'Bearer token-valido' },
            body: form,
        });

        expect(resposta.status).toBe(201);
        expect(ServicoController.criarServico).toHaveBeenCalledTimes(1);
        expect(ServicoController.criarServico.mock.calls[0][0].body).toEqual(
            expect.objectContaining({
                prof_id: '8',
                agenda_servico_id: '3',
                descricao: 'Servico residencial',
                agendado_para: '2099-01-01T10:00:00.000Z',
            })
        );
    });
});
