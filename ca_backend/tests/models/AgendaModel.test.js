jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

const pool = require('../../src/config/db');
const AgendaModel = require('../../src/models/AgendaModel');

describe('AgendaModel.criarAgendaPadraoParaProfissional', () => {
    test('persiste servicos e horarios padrao para que o app receba IDs reais', async () => {
        const client = { query: jest.fn().mockResolvedValue({}) };

        await AgendaModel.criarAgendaPadraoParaProfissional(42, client);

        expect(client.query).toHaveBeenCalledTimes(23);
        expect(client.query.mock.calls[0][0]).toContain(
            'INSERT INTO profissional_agenda_servicos'
        );
        expect(client.query.mock.calls[0][1]).toEqual([
            42,
            'Visita Tecnica',
            40,
            80,
            0,
        ]);
        expect(client.query.mock.calls[3][0]).toContain(
            'INSERT INTO profissional_agenda_horarios'
        );
        expect(client.query.mock.calls[3][1]).toEqual([42, 1, '09:00']);
    });

    test('recusa chamada sem a transacao de cadastro', async () => {
        await expect(
            AgendaModel.criarAgendaPadraoParaProfissional(42)
        ).rejects.toThrow('conexao de banco valida');
    });

    test('materializa a agenda padrao ao consultar uma conta antiga sem configuracao', async () => {
        const client = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
        };
        pool.connect.mockResolvedValue(client);
        pool.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    id: 77,
                    nome: 'Visita Tecnica',
                    duracao_minutos: 40,
                    preco: 80,
                    ativo: true,
                    ordem: 0,
                }],
            })
            .mockResolvedValueOnce({
                rows: [{ dia_semana: 1, horario: '09:00', ativo: true }],
            });

        const agenda = await AgendaModel.buscarPorProfissional(42);

        expect(agenda.usando_padrao).toBe(false);
        expect(agenda.servicos[0]).toEqual(expect.objectContaining({ id: 77 }));
        expect(client.query).toHaveBeenCalledWith(
            'SELECT pg_advisory_xact_lock($1::bigint)',
            [42]
        );
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalled();
    });
});
