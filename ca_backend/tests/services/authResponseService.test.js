jest.mock('../../src/services/authTokenService', () => ({
    criarSessao: jest.fn(),
}));

const { criarSessao } = require('../../src/services/authTokenService');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../../src/services/authResponseService');

describe('authResponseService', () => {
    const usuario = {
        id: 9,
        nome: 'Ana',
        email: 'ana@example.com',
        telefone: null,
        cidade_amauc: 'Concordia',
        perfil_tipo: 'cidadao',
        foto_url: null,
        latitude: '-27.2',
        longitude: '-52.0',
    };

    test('monta somente os dados esperados pelo cliente', () => {
        expect(montarRespostaUsuario(usuario)).toEqual(expect.objectContaining({
            id: 9,
            perfil_tipo: 'cidadao',
            tipo_usuario: 'cidadao',
            foto_url: null,
            latitude: -27.2,
            longitude: -52,
        }));
        expect(montarRespostaUsuario({ ...usuario, latitude: null, longitude: undefined }))
            .toEqual(expect.objectContaining({ latitude: null, longitude: null }));
    });

    test('inclui access e refresh token na resposta de login', async () => {
        criarSessao.mockResolvedValue({
            accessToken: 'access', refreshToken: 'refresh', expiresIn: 900,
        });

        await expect(criarRespostaLogin(usuario, 'Login realizado!')).resolves.toEqual({
            mensagem: 'Login realizado!',
            token: 'access',
            access_token: 'access',
            refresh_token: 'refresh',
            expires_in: 900,
            usuario: expect.objectContaining({ id: 9 }),
        });
    });
});
