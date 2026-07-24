jest.mock('../../src/models/UserModel', () => ({
    buscarPorId: jest.fn(),
}));

jest.mock('../../src/models/OAuthLoginTicketModel', () => ({
    criar: jest.fn(),
    consumir: jest.fn(),
}));

jest.mock('../../src/controllers/SocialAuthController', () => ({
    obterOuCriarUsuarioSocial: jest.fn(),
}));

jest.mock('../../src/services/authResponseService', () => ({
    criarRespostaLogin: jest.fn(),
    montarRespostaUsuario: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
    warn: jest.fn(),
}));

const UserModel = require('../../src/models/UserModel');
const OAuthLoginTicketModel = require('../../src/models/OAuthLoginTicketModel');
const {
    obterOuCriarUsuarioSocial,
} = require('../../src/controllers/SocialAuthController');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../../src/services/authResponseService');
const GithubOAuthController = require('../../src/controllers/GithubOAuthController');

function criarRespostaMock() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
}

function respostaJson(dados, ok = true) {
    return {
        ok,
        json: async () => dados,
    };
}

describe('GithubOAuthController', () => {
    const fetchOriginal = global.fetch;
    const envOriginal = {
        JWT_SECRET: process.env.JWT_SECRET,
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
        GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
        GITHUB_WEB_REDIRECT_URI: process.env.GITHUB_WEB_REDIRECT_URI,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'chave-de-teste-forte-com-mais-de-trinta-e-dois-caracteres';
        process.env.GITHUB_CLIENT_ID = 'github-client-id';
        process.env.GITHUB_CLIENT_SECRET = 'github-client-secret';
        process.env.GITHUB_REDIRECT_URI =
            'https://api.example.test/api/v1/auth/github/callback';
        process.env.GITHUB_WEB_REDIRECT_URI = 'https://app.example.test/auth.html';
        global.fetch = jest.fn();
    });

    afterAll(() => {
        global.fetch = fetchOriginal;
        for (const [nome, valor] of Object.entries(envOriginal)) {
            if (valor === undefined) delete process.env[nome];
            else process.env[nome] = valor;
        }
    });

    function iniciarState({ platform = 'android' } = {}) {
        const stateCliente = 'a'.repeat(48);
        const res = criarRespostaMock();
        GithubOAuthController.autorizar({
            query: {
                platform,
                cidade_amauc: 'Concórdia',
                state: stateCliente,
            },
        }, res);
        const urlAutorizacao = new URL(res.redirect.mock.calls[0][1]);
        return {
            stateCliente,
            stateAssinado: urlAutorizacao.searchParams.get('state'),
            urlAutorizacao,
        };
    }

    test('inicia Authorization Code com state assinado, redirect fixo e escopos minimos', () => {
        const { stateAssinado, urlAutorizacao } = iniciarState();

        expect(urlAutorizacao.origin).toBe('https://github.com');
        expect(urlAutorizacao.pathname).toBe('/login/oauth/authorize');
        expect(urlAutorizacao.searchParams.get('client_id')).toBe('github-client-id');
        expect(urlAutorizacao.searchParams.get('redirect_uri')).toBe(
            process.env.GITHUB_REDIRECT_URI
        );
        expect(urlAutorizacao.searchParams.get('scope')).toBe('read:user user:email');
        expect(stateAssinado).not.toBe('a'.repeat(48));
    });

    test('troca code somente no backend e devolve ticket de uso unico ao Android', async () => {
        const { stateCliente, stateAssinado } = iniciarState();
        global.fetch
            .mockResolvedValueOnce(respostaJson({ access_token: 'github-access-token' }))
            .mockResolvedValueOnce(respostaJson({
                id: 81,
                login: 'ana-github',
                name: 'Ana GitHub',
                avatar_url: 'https://avatars.example.test/ana.png',
            }))
            .mockResolvedValueOnce(respostaJson([
                { email: 'ana@example.test', primary: true, verified: true },
            ]));
        obterOuCriarUsuarioSocial.mockResolvedValue({ id: 27, ativo: true });
        OAuthLoginTicketModel.criar.mockResolvedValue({ id: 1 });
        const res = criarRespostaMock();

        await GithubOAuthController.callback({
            query: { code: 'authorization-code', state: stateAssinado },
        }, res);

        expect(global.fetch).toHaveBeenNthCalledWith(
            1,
            'https://github.com/login/oauth/access_token',
            expect.objectContaining({ method: 'POST' })
        );
        const bodyToken = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(bodyToken).toEqual(expect.objectContaining({
            client_id: 'github-client-id',
            client_secret: 'github-client-secret',
            code: 'authorization-code',
            redirect_uri: process.env.GITHUB_REDIRECT_URI,
        }));
        expect(obterOuCriarUsuarioSocial).toHaveBeenCalledWith({
            perfilSocial: expect.objectContaining({ email: 'ana@example.test' }),
            provider: 'github',
            cidade: 'Concórdia',
        });
        expect(OAuthLoginTicketModel.criar).toHaveBeenCalledWith(
            expect.objectContaining({ usuarioId: 27, stateHash: expect.any(String) })
        );
        const destino = res.redirect.mock.calls[0][1];
        expect(destino).toContain('conecta-amauc-auth://github?');
        expect(destino).toContain(`state=${stateCliente}`);
        expect(destino).toContain('ticket=');
        expect(destino).not.toContain('github-access-token');
    });

    test('recusa callback com state adulterado antes de chamar GitHub', async () => {
        const res = criarRespostaMock();

        await GithubOAuthController.callback({
            query: { code: 'authorization-code', state: 'state.adulterado' },
        }, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('trata cancelamento sem trocar code', async () => {
        const { stateCliente, stateAssinado } = iniciarState({ platform: 'web' });
        const res = criarRespostaMock();

        await GithubOAuthController.callback({
            query: { error: 'access_denied', state: stateAssinado },
        }, res);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith(
            303,
            expect.stringContaining(`state=${stateCliente}`)
        );
        expect(res.redirect.mock.calls[0][1]).toContain('error=Login+GitHub+cancelado.');
    });

    test('trata token invalido e e-mail nao verificado sem criar ticket', async () => {
        const primeiro = iniciarState();
        global.fetch.mockResolvedValueOnce(respostaJson({ error: 'bad_verification_code' }));
        const resToken = criarRespostaMock();

        await GithubOAuthController.callback({
            query: { code: 'code-invalido', state: primeiro.stateAssinado },
        }, resToken);

        expect(OAuthLoginTicketModel.criar).not.toHaveBeenCalled();
        expect(resToken.redirect.mock.calls[0][1]).toContain('Codigo+GitHub+invalido');

        jest.clearAllMocks();
        const segundo = iniciarState();
        global.fetch
            .mockResolvedValueOnce(respostaJson({ access_token: 'github-access-token' }))
            .mockResolvedValueOnce(respostaJson({ id: 81, login: 'ana-github' }))
            .mockResolvedValueOnce(respostaJson([
                { email: 'ana@example.test', primary: true, verified: false },
            ]));
        const resEmail = criarRespostaMock();

        await GithubOAuthController.callback({
            query: { code: 'code-sem-email', state: segundo.stateAssinado },
        }, resEmail);

        expect(OAuthLoginTicketModel.criar).not.toHaveBeenCalled();
        expect(resEmail.redirect.mock.calls[0][1]).toContain('sem+e-mail+verificado');
    });

    test('consome ticket uma unica vez antes de emitir a sessao local', async () => {
        OAuthLoginTicketModel.consumir.mockResolvedValue({ usuario_id: 27 });
        UserModel.buscarPorId.mockResolvedValue({ id: 27, nome: 'Ana', ativo: true });
        montarRespostaUsuario.mockReturnValue({ id: 27, nome: 'Ana' });
        criarRespostaLogin.mockResolvedValue({
            access_token: 'access-token-local',
            refresh_token: 'refresh-token-local',
        });
        const res = criarRespostaMock();

        await GithubOAuthController.concluir({
            body: { ticket: 'ticket-curto', state: 'b'.repeat(48) },
        }, res);

        expect(OAuthLoginTicketModel.consumir).toHaveBeenCalledWith({
            tokenHash: expect.any(String),
            stateHash: expect.any(String),
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            access_token: 'access-token-local',
            refresh_token: 'refresh-token-local',
        });
    });
});
