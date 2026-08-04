jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const AvaliacaoModel = require('../../src/models/AvaliacaoModel');
const FavoritoModel = require('../../src/models/FavoritoModel');
const ServicoModel = require('../../src/models/ServicoModel');
const UserModel = require('../../src/models/UserModel');

describe('paginacao dos models', () => {
    test('prestador envia conclusao com evidencia para confirmacao do cliente', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id: 44,
                status: 'aguardando_confirmacao_cliente',
            }],
        });

        const resultado = await ServicoModel.marcarConclusaoPeloPrestador(44, 9);

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain("status = 'aguardando_confirmacao_cliente'");
        expect(sql).toContain("status = 'aceito'");
        expect(sql).toContain('cardinality');
        expect(pool.query.mock.calls[0][1]).toEqual([44, 9]);
        expect(resultado.status).toBe('aguardando_confirmacao_cliente');
    });

    test('somente o cliente do chamado confirma a conclusao pendente', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id: 44,
                status: 'concluido',
                conclusao_confirmada_automaticamente: false,
            }],
        });

        const resultado = await ServicoModel.confirmarConclusaoPeloCliente(44, 12);

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain('cidadao_id = $2');
        expect(sql).toContain("status = 'aguardando_confirmacao_cliente'");
        expect(pool.query.mock.calls[0][1]).toEqual([44, 12]);
        expect(resultado.status).toBe('concluido');
    });

    test('evidencias ficam imutaveis depois que a confirmacao foi solicitada', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 44, status: 'aceito' }] });

        await ServicoModel.adicionarFotosConclusao(
            44,
            9,
            ['/uploads/evidencia.jpg']
        );

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain("AND status = 'aceito'");
        expect(sql).not.toContain('aguardando_confirmacao_cliente');
    });

    test('persiste coordenadas privadas do local de atendimento', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 44 }] });

        await ServicoModel.criar(12, 9, 'Trocar tomada', null, {
            agenda_servico_id: 3,
            servico_nome: 'Eletricista',
            endereco_atendimento: 'Rua Central',
            atendimento_latitude: -27.2335,
            atendimento_longitude: -52.0277,
            agendado_para: '2030-01-03T14:30:00',
            duracao_minutos: 60,
            preco: 150,
        });

        expect(pool.query.mock.calls[0][0]).toContain('atendimento_latitude');
        expect(pool.query.mock.calls[0][0]).toContain('atendimento_longitude');
        expect(pool.query.mock.calls[0][1]).toEqual([
            12,
            9,
            3,
            null,
            'Eletricista',
            'Trocar tomada',
            'Rua Central',
            -27.2335,
            -52.0277,
            '2030-01-03T14:30:00',
            60,
            null,
            150,
        ]);
    });

    test('pagina solicitacoes do cidadao com filtro e total', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 25 }] })
            .mockResolvedValueOnce({ rows: [{ id: 44 }] });

        const resultado = await ServicoModel.buscarPorCidadao(
            12,
            'concluido',
            { page: 2, pageSize: 10 }
        );

        expect(pool.query.mock.calls[0][0]).toContain('COUNT(*)');
        expect(pool.query.mock.calls[0][1]).toEqual([12, 'concluido']);
        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $3 OFFSET $4');
        expect(pool.query.mock.calls[1][1]).toEqual([
            12,
            'concluido',
            10,
            10,
        ]);
        expect(resultado).toEqual({
            items: [{ id: 44 }],
            total: 25,
            page: 2,
            pageSize: 10,
            totalPages: 3,
            hasMore: true,
        });
    });

    test('pagina solicitacoes do profissional com valores padrao', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 1 }] })
            .mockResolvedValueOnce({ rows: [{ id: 44 }] });

        const resultado = await ServicoModel.buscarPorProfissional(9);

        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
        expect(pool.query.mock.calls[1][1]).toEqual([9, 20, 0]);
        expect(resultado.hasMore).toBe(false);
        expect(resultado.total).toBe(1);
    });

    test('pagina historico de avaliacoes do profissional', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 41 }] })
            .mockResolvedValueOnce({ rows: [{ id: 77 }] });

        const resultado = await AvaliacaoModel.buscarPorProfissional(9, {
            page: 3,
            pageSize: 20,
        });

        const consultaPublica = pool.query.mock.calls[1][0].toLowerCase();
        expect(consultaPublica).toContain('limit $2 offset $3');
        expect(consultaPublica).not.toContain('cidadao_nome');
        expect(consultaPublica).not.toContain('servico_descricao');
        expect(consultaPublica).not.toContain('usuarios');
        expect(consultaPublica).not.toContain('select a.*');
        expect(pool.query.mock.calls[1][1]).toEqual([9, 20, 40]);
        expect(resultado.totalPages).toBe(3);
        expect(resultado.hasMore).toBe(false);
    });

    test('pagina favoritos e mantem total independente da pagina', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 22 }] })
            .mockResolvedValueOnce({
                rows: [{ id: 9, cidade_amauc: 'Concordia' }],
            });

        const resultado = await FavoritoModel.listar({
            usuarioId: 12,
            page: 2,
            pageSize: 20,
        });

        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
        expect(pool.query.mock.calls[1][1]).toEqual([12, 20, 20]);
        expect(resultado.items).toHaveLength(1);
        expect(resultado.total).toBe(22);
        expect(resultado.hasMore).toBe(false);
    });

    test('pagina usuarios administrativos com filtro e busca parametrizada', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 21 }] })
            .mockResolvedValueOnce({ rows: [{ id: 12, email: 'maria@exemplo.com' }] });

        const resultado = await UserModel.listarParaAdmin({
            perfilTipo: 'cidadao',
            busca: 'maria',
            page: 2,
            pageSize: 20,
        });

        expect(pool.query.mock.calls[0][0]).toContain('u.perfil_tipo = $1');
        expect(pool.query.mock.calls[0][0]).toContain('u.email ILIKE $2');
        expect(pool.query.mock.calls[0][1]).toEqual(['cidadao', '%maria%']);
        expect(pool.query.mock.calls[1][0]).toContain('LIMIT $3 OFFSET $4');
        expect(pool.query.mock.calls[1][1]).toEqual([
            'cidadao', '%maria%', 20, 20,
        ]);
        expect(resultado).toEqual(expect.objectContaining({
            items: [{ id: 12, email: 'maria@exemplo.com' }],
            total: 21,
            page: 2,
            pageSize: 20,
            totalPages: 2,
            hasMore: false,
        }));
    });

    test('nao reativa registros anonimizados no controle administrativo', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const resultado = await UserModel.atualizarStatusPorAdmin({
            usuarioId: 12,
            ativo: true,
        });

        expect(pool.query.mock.calls[0][0]).toContain('excluido_em IS NULL');
        expect(pool.query.mock.calls[0][1]).toEqual([12, true]);
        expect(resultado).toBeUndefined();
    });
});
