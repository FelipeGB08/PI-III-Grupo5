jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

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
});
