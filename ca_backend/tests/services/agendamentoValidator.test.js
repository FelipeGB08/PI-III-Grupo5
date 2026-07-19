jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../../src/models/AgendaModel', () => ({
    buscarServicoAtivoDoProfissional: jest.fn(),
    horarioAtivoDoProfissional: jest.fn(),
}));

const pool = require('../../src/config/db');
const AgendaModel = require('../../src/models/AgendaModel');
const { validarAgendamento } = require('../../src/services/agendamentoValidator');

const AGORA = new Date('2030-01-02T10:00:00');
const FUTURO = '2030-01-02T14:30:00';

function parametros(overrides = {}) {
    return {
        profId: 7,
        agendaServicoId: 19,
        agendadoPara: FUTURO,
        ...overrides,
    };
}

describe('validarAgendamento', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(AGORA);

        AgendaModel.buscarServicoAtivoDoProfissional.mockResolvedValue({
            id: 19,
            nome: 'Instalacao eletrica',
            preco: '125.50',
            duracao_minutos: '90',
        });
        AgendaModel.horarioAtivoDoProfissional.mockResolvedValue(true);
        pool.query.mockResolvedValue({ rows: [] });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('exige o servico da agenda', async () => {
        await expect(
            validarAgendamento(parametros({ agendaServicoId: null }))
        ).rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test('exige data e horario', async () => {
        await expect(
            validarAgendamento(parametros({ agendadoPara: null }))
        ).rejects.toMatchObject({ status: 400 });
    });

    test('rejeita data invalida', async () => {
        await expect(
            validarAgendamento(parametros({ agendadoPara: 'data-invalida' }))
        ).rejects.toMatchObject({ status: 400 });
    });

    test('rejeita horario no passado', async () => {
        await expect(
            validarAgendamento(parametros({ agendadoPara: '2030-01-02T09:59:00' }))
        ).rejects.toMatchObject({ status: 400 });

        expect(AgendaModel.buscarServicoAtivoDoProfissional).not.toHaveBeenCalled();
    });

    test('rejeita servico inativo ou de outro prestador', async () => {
        AgendaModel.buscarServicoAtivoDoProfissional.mockResolvedValue(null);

        await expect(validarAgendamento(parametros())).rejects.toMatchObject({
            status: 400,
        });
        expect(AgendaModel.horarioAtivoDoProfissional).not.toHaveBeenCalled();
    });

    test('rejeita horario fora da agenda do prestador', async () => {
        AgendaModel.horarioAtivoDoProfissional.mockResolvedValue(false);

        await expect(validarAgendamento(parametros())).rejects.toMatchObject({
            status: 400,
        });
        expect(pool.query).not.toHaveBeenCalled();
    });

    test('rejeita conflito para o mesmo prestador e horario', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 88 }] });

        await expect(validarAgendamento(parametros())).rejects.toMatchObject({
            status: 409,
        });

        expect(pool.query).toHaveBeenCalledWith(
            expect.stringMatching(
                /WHERE prof_id = \$1[\s\S]*status IN \('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada'\)/
            ),
            [7, '2030-01-02T14:30:00', null]
        );
    });

    test('ignora a propria solicitacao ao validar remarcacao', async () => {
        await validarAgendamento(parametros({ ignorarSolicitacaoId: 44 }));

        expect(pool.query).toHaveBeenCalledWith(
            expect.any(String),
            [7, '2030-01-02T14:30:00', 44]
        );
    });

    test('normaliza e retorna um horario valido', async () => {
        const resultado = await validarAgendamento(parametros());
        const diaSemanaEsperado = new Date(FUTURO).getDay() || 7;

        expect(AgendaModel.horarioAtivoDoProfissional).toHaveBeenCalledWith(
            7,
            diaSemanaEsperado,
            '14:30'
        );
        expect(resultado).toEqual({
            agenda_servico_id: 19,
            servico_nome: 'Instalacao eletrica',
            preco: 125.5,
            duracao_minutos: 90,
            agendado_para: '2030-01-02T14:30:00',
        });
    });

    test('converte domingo para o dia 7 da agenda', async () => {
        await validarAgendamento(
            parametros({ agendadoPara: '2030-01-06T14:30:00' })
        );

        expect(AgendaModel.horarioAtivoDoProfissional).toHaveBeenCalledWith(
            7,
            7,
            '14:30'
        );
    });
});
