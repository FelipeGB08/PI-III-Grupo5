jest.mock('../../src/models/ProfissionalModel', () => ({
    buscarPorFiltros: jest.fn(),
    buscarPorId: jest.fn(),
}));

const ProfissionalModel = require('../../src/models/ProfissionalModel');
const ProfissionalController = require('../../src/controllers/ProfissionalController');

function criarRespostaMock() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn();
    return res;
}

const profissionalComDadosSensiveis = {
    id: 8,
    nome: 'Profissional Publico',
    foto_url: '/uploads/perfil.jpg',
    cidade_amauc: 'Concordia',
    biografia: 'Profissional com experiencia regional.',
    categorias: ['TI'],
    media_avaliacao: 4.8,
    total_servicos: 12,
    avaliacoes_positivas: 11,
    verificado: true,
    atende_rural: true,
    atende_emergencia: true,
    possui_veiculo: true,
    cidades_atendidas: ['Concordia', 'Ita'],
    anos_experiencia: 9,
    distancia_km: 2.4,
    latitude: -27.23,
    longitude: -52.02,
    localizacao_aproximada: true,
    email: 'privado@exemplo.com',
    telefone: '(49) 99999-9999',
    senha: 'nao-deve-vazar',
    senha_hash: 'hash-secreto',
    token: 'token-secreto',
    refresh_token: 'refresh-secreto',
    endereco_principal: 'Rua Privada, 10',
    portfolio_url: 'https://exemplo.com/contato-privado',
    status_verificacao: 'aprovado',
    documento_url: 'verificacoes/arquivo-privado.jpg',
    revisado_por: 1,
};

function esperarSemDadosSensiveis(resposta) {
    const serializado = JSON.stringify(resposta).toLowerCase();

    for (const campo of [
        'email',
        'telefone',
        'senha',
        'token',
        'hash',
        'endereco_principal',
        'portfolio_url',
        'total_servicos',
        'avaliacoes_positivas',
        'atende_rural',
        'atende_emergencia',
        'possui_veiculo',
        'cidades_atendidas',
        'anos_experiencia',
        'status_verificacao',
        'documento_url',
        'revisado_por',
    ]) {
        expect(serializado).not.toContain(campo);
    }
}

describe('ProfissionalController', () => {
    test('lista publica retorna somente o perfil permitido', async () => {
        ProfissionalModel.buscarPorFiltros.mockResolvedValue({
            rows: [profissionalComDadosSensiveis],
            total: 1,
        });
        const res = criarRespostaMock();

        await ProfissionalController.listar({ query: {} }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const resposta = res.json.mock.calls[0][0];
        expect(resposta).toEqual([
            {
                id: 8,
                nome: 'Profissional Publico',
                foto_url: '/uploads/perfil.jpg',
                cidade_amauc: 'Concordia',
                biografia: 'Profissional com experiencia regional.',
                categorias: ['TI'],
                verificado: true,
                media_avaliacao: 4.8,
                distancia_km: 2.4,
                latitude: -27.23,
                longitude: -52.02,
                localizacao_aproximada: true,
            },
        ]);
        esperarSemDadosSensiveis(resposta);
    });

    test('detalhe publico nao vaza dados pessoais ou credenciais', async () => {
        ProfissionalModel.buscarPorId.mockResolvedValue(profissionalComDadosSensiveis);
        const res = criarRespostaMock();

        await ProfissionalController.buscarPorId({ params: { id: '8' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const resposta = res.json.mock.calls[0][0];
        expect(resposta).toEqual({
            id: 8,
            nome: 'Profissional Publico',
            foto_url: '/uploads/perfil.jpg',
            cidade_amauc: 'Concordia',
            biografia: 'Profissional com experiencia regional.',
            categorias: ['TI'],
            verificado: true,
            media_avaliacao: 4.8,
            distancia_km: 2.4,
            latitude: -27.23,
            longitude: -52.02,
            localizacao_aproximada: true,
        });
        esperarSemDadosSensiveis(resposta);
    });

    test('encaminha os filtros avancados validados sem alterar a resposta publica', async () => {
        ProfissionalModel.buscarPorFiltros.mockResolvedValue({
            rows: [profissionalComDadosSensiveis],
            total: 1,
        });
        const res = criarRespostaMock();

        await ProfissionalController.listar({
            validated: {
                query: {
                    preco_min: 80,
                    preco_max: 250,
                    nota_minima: 4.5,
                    disponivel_em: '2030-06-10',
                    page: 2,
                    limit: 10,
                },
            },
            query: {},
        }, res);

        expect(ProfissionalModel.buscarPorFiltros).toHaveBeenCalledWith(
            null,
            null,
            null,
            expect.objectContaining({
                precoMin: 80,
                precoMax: 250,
                notaMinima: 4.5,
                disponivelEm: '2030-06-10',
                limit: 10,
                offset: 10,
            })
        );
        esperarSemDadosSensiveis(res.json.mock.calls[0][0]);
    });
});
