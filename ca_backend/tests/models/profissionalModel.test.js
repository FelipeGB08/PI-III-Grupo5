jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
}));

const pool = require('../../src/config/db');
const ProfissionalModel = require('../../src/models/ProfissionalModel');

describe('ProfissionalModel - localizacao publica aproximada', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('calcula coordenadas pelo municipio e distancia sem usar GPS pessoal', async () => {
        pool.query.mockResolvedValue({
            rows: [
                { id: 2, nome: 'Profissional Irani', cidade_amauc: 'Irani' },
                { id: 1, nome: 'Profissional Concordia', cidade_amauc: 'Concórdia' },
            ],
        });

        const resultado = await ProfissionalModel.buscarPorFiltros(
            null,
            null,
            null,
            {
                lat: -27.2342,
                lng: -52.0277,
                raioKm: 80,
                limit: 20,
                offset: 0,
            }
        );

        expect(resultado.total).toBe(2);
        expect(resultado.rows[0]).toEqual(expect.objectContaining({
            id: 1,
            latitude: -27.2342,
            longitude: -52.0277,
            distancia_km: 0,
            localizacao_aproximada: true,
        }));
        expect(resultado.rows[1]).toEqual(expect.objectContaining({
            id: 2,
            latitude: -27.0242,
            longitude: -51.9017,
            localizacao_aproximada: true,
        }));
    });

    test('detalhe tambem retorna apenas o centro aproximado do municipio', async () => {
        pool.query.mockResolvedValue({
            rows: [
                { id: 3, nome: 'Profissional Ita', cidade_amauc: 'Itá' },
            ],
        });

        const resultado = await ProfissionalModel.buscarPorId(3);

        expect(resultado).toEqual(expect.objectContaining({
            latitude: -27.2906,
            longitude: -52.3219,
            distancia_km: null,
            localizacao_aproximada: true,
        }));
    });

    test.each([
        [
            'faixa de preco',
            { precoMin: 80, limit: 20, offset: 0 },
            ['profissional_agenda_servicos pas', 'pas.preco >= $1'],
            [80],
        ],
        [
            'nota minima',
            { notaMinima: 4.5, limit: 20, offset: 0 },
            ['HAVING COALESCE(AVG(a.nota_estrelas), 0) >= $1'],
            [4.5],
        ],
        [
            'disponibilidade em data especifica',
            { disponivelEm: '2030-06-10', limit: 20, offset: 0 },
            [
                'profissional_agenda_horarios pah',
                'EXTRACT(ISODOW FROM $1::date)',
                's_agendado.status IN',
                's_agendado.agendado_para = ($1::date + pah.horario)',
            ],
            ['2030-06-10'],
        ],
    ])('filtra por %s usando parametros preparados', async (_, filtros, trechos, parametros) => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 9, cidade_amauc: 'Concordia' }] });

        const resultado = await ProfissionalModel.buscarPorFiltros(
            null,
            null,
            null,
            filtros
        );

        const [sql, valores] = pool.query.mock.calls[0];
        for (const trecho of trechos) {
            expect(sql).toContain(trecho);
        }
        expect(valores).toEqual(parametros);
        expect(resultado.rows).toHaveLength(1);
    });

    test('combina filtros sem interpolar valores do usuario no SQL', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 9, nome: 'Profissional compativel', cidade_amauc: 'Concordia' }],
        });

        const resultado = await ProfissionalModel.buscarPorFiltros(
            'Concordia',
            'Eletricista',
            true,
            {
                precoMin: 100,
                precoMax: 250,
                notaMinima: 4,
                disponivelEm: '2030-06-10',
                limit: 20,
                offset: 0,
            }
        );

        const [sql, valores] = pool.query.mock.calls[0];
        expect(sql).toContain('u.cidade_amauc = $1');
        expect(sql).toContain('c.nome_servico ILIKE $2');
        expect(sql).toContain('pp.atende_rural = TRUE');
        expect(sql).toContain('pas.preco >= $3');
        expect(sql).toContain('pas.preco <= $4');
        expect(sql).toContain('EXTRACT(ISODOW FROM $5::date)');
        expect(sql).toContain('HAVING COALESCE(AVG(a.nota_estrelas), 0) >= $6');
        expect(valores).toEqual([
            'Concordia',
            'Eletricista',
            100,
            250,
            '2030-06-10',
            4,
        ]);
        expect(sql).not.toContain("'Concordia'");
        expect(resultado.rows).toEqual([
            expect.objectContaining({ nome: 'Profissional compativel' }),
        ]);
    });
});
