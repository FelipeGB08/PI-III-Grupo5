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

const AGORA = new Date('2030-01-02T12:00:00.000Z');
const FUTURO = '2030-01-02T14:30:00-03:00';

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
        pool.query.mockImplementation((sql) => {
            if (String(sql).includes('FROM profissional_categorias')) {
                return Promise.resolve({ rows: [{ id: 4 }] });
            }
            return Promise.resolve({ rows: [] });
        });
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
            validarAgendamento(parametros({ agendadoPara: '2030-01-02T08:59:00-03:00' }))
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
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 4 }] })
            .mockResolvedValueOnce({ rows: [{ id: 88 }] });

        await expect(validarAgendamento(parametros())).rejects.toMatchObject({
            status: 409,
        });

        expect(pool.query).toHaveBeenCalledWith(
            expect.stringMatching(
                /WHERE prof_id = \$1[\s\S]*status IN \('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada'\)/
            ),
            [7, '2030-01-02T17:30:00.000Z', null]
        );
    });

    test('ignora a propria solicitacao ao validar remarcacao', async () => {
        await validarAgendamento(parametros({ ignorarSolicitacaoId: 44 }));

        expect(pool.query).toHaveBeenCalledWith(
            expect.any(String),
            [7, '2030-01-02T17:30:00.000Z', 44]
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
            categoria_id: 4,
            servico_nome: 'Instalacao eletrica',
            preco: 125.5,
            duracao_minutos: 90,
            agendado_para: '2030-01-02T17:30:00.000Z',
        });
    });

    test('preserva o mesmo horario de negocio sob TZ UTC e America/Sao_Paulo', async () => {
        const timezoneOriginal = process.env.TZ;
        const resultados = [];

        try {
            for (const timezone of ['UTC', 'America/Sao_Paulo']) {
                process.env.TZ = timezone;
                AgendaModel.horarioAtivoDoProfissional.mockClear();
                pool.query.mockClear();

                const resultado = await validarAgendamento(parametros());
                resultados.push({
                    resultado,
                    agenda: AgendaModel.horarioAtivoDoProfissional.mock.calls[0],
                });
            }
        } finally {
            process.env.TZ = timezoneOriginal;
        }

        expect(resultados[0]).toEqual(resultados[1]);
        expect(resultados[0].agenda).toEqual([7, 3, '14:30']);
        expect(resultados[0].resultado.agendado_para).toBe(
            '2030-01-02T17:30:00.000Z'
        );
    });

    test('converte domingo para o dia 7 da agenda', async () => {
        await validarAgendamento(
            parametros({ agendadoPara: '2030-01-06T14:30:00-03:00' })
        );

        expect(AgendaModel.horarioAtivoDoProfissional).toHaveBeenCalledWith(
            7,
            7,
            '14:30'
        );
    });
});
