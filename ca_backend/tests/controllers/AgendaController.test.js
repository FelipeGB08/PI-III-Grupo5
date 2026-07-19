jest.mock('../../src/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../../src/models/AgendaModel', () => ({
    buscarPorProfissional: jest.fn(),
    salvarParaProfissional: jest.fn(),
    normalizarHorario: jest.fn((horario) => {
        const texto = String(horario || '').trim();
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto) ? texto : null;
    }),
}));

jest.mock('../../src/models/UserModel', () => ({
    buscarPorId: jest.fn(),
}));

const AgendaModel = require('../../src/models/AgendaModel');
const UserModel = require('../../src/models/UserModel');
const AgendaController = require('../../src/controllers/AgendaController');
const validate = require('../../src/middlewares/validateMiddleware');
const { salvarAgendaSchema } = require('../../src/validators/agendaSchemas');
const { criarRespostaMock } = require('../helpers/httpMocks');

async function salvarMinhaComValidacao(req, res) {
    let controllerPromise;
    validate(salvarAgendaSchema)(req, res, () => {
        controllerPromise = AgendaController.salvarMinha(req, res);
    });
    if (controllerPromise) await controllerPromise;
}

describe('AgendaController', () => {
    test('rejeita agenda sem servicos', async () => {
        const req = { body: {}, usuarioLogado: { id: 5 } };
        const res = criarRespostaMock();

        await salvarMinhaComValidacao(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(AgendaModel.salvarParaProfissional).not.toHaveBeenCalled();
    });

    test('limita a agenda a doze servicos', async () => {
        const req = {
            body: { servicos: Array.from({ length: 13 }, () => ({ nome: 'Servico' })) },
            usuarioLogado: { id: 5 },
        };
        const res = criarRespostaMock();

        await salvarMinhaComValidacao(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test.each([
        [{ nome: 'AB', duracao_minutos: 60, preco: 100 }],
        [{ nome: 'Servico valido', duracao_minutos: 14, preco: 100 }],
        [{ nome: 'Servico valido', duracao_minutos: 481, preco: 100 }],
        [{ nome: 'Servico valido', duracao_minutos: 60, preco: 0 }],
    ])('rejeita servico com regra invalida', async (servico) => {
        const req = {
            body: { servicos: [servico], horarios: ['09:00'] },
            usuarioLogado: { id: 5 },
        };
        const res = criarRespostaMock();

        await salvarMinhaComValidacao(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(AgendaModel.salvarParaProfissional).not.toHaveBeenCalled();
    });

    test('rejeita agenda sem horario valido', async () => {
        const req = {
            body: {
                servicos: [{ nome: 'Servico valido', duracao_minutos: 60, preco: 100 }],
                horarios: ['25:00'],
            },
            usuarioLogado: { id: 5 },
        };
        const res = criarRespostaMock();

        await salvarMinhaComValidacao(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('normaliza servicos, dias unicos e horarios antes de salvar', async () => {
        const agendaSalva = { servicos: [{ id: 1 }], horarios: [] };
        AgendaModel.salvarParaProfissional.mockResolvedValue(agendaSalva);
        const req = {
            body: {
                servicos: [
                    { nome: '  Eletricista  ', duracao_minutos: 45.6, preco: '120.50' },
                ],
                dias_semana: [1, 1, 6, 9],
                horarios: ['09:00', '14:30'],
            },
            usuarioLogado: { id: 5 },
        };
        const res = criarRespostaMock();

        await salvarMinhaComValidacao(req, res);

        expect(AgendaModel.salvarParaProfissional).toHaveBeenCalledWith(5, {
            servicos: [
                { nome: 'Eletricista', duracao_minutos: 46, preco: 120.5 },
            ],
            horarios: [
                { dia_semana: 1, horario: '09:00' },
                { dia_semana: 1, horario: '14:30' },
                { dia_semana: 6, horario: '09:00' },
                { dia_semana: 6, horario: '14:30' },
            ],
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Agenda salva com sucesso.',
            agenda: agendaSalva,
        });
    });

    test('aceita horarios no formato de objetos', async () => {
        AgendaModel.salvarParaProfissional.mockResolvedValue({});
        const req = {
            body: {
                servicos: [{ nome: 'Pintura', duracaoMinutos: 120, preco: 300 }],
                horarios: [
                    { diaSemana: 2, horario: '10:00' },
                    { dia_semana: 8, horario: '11:00' },
                ],
            },
            usuarioLogado: { id: 5 },
        };
        const res = criarRespostaMock();

        await salvarMinhaComValidacao(req, res);

        expect(AgendaModel.salvarParaProfissional).toHaveBeenCalledWith(
            5,
            expect.objectContaining({
                horarios: [{ dia_semana: 2, horario: '10:00' }],
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('bloqueia consulta publica de usuario que nao e profissional', async () => {
        UserModel.buscarPorId.mockResolvedValue({ id: 8, perfil_tipo: 'cidadao' });
        const req = { params: { id: '8' } };
        const res = criarRespostaMock();

        await AgendaController.buscarPublica(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(AgendaModel.buscarPorProfissional).not.toHaveBeenCalled();
    });

    test('retorna a agenda publica do profissional', async () => {
        UserModel.buscarPorId.mockResolvedValue({ id: 8, perfil_tipo: 'profissional' });
        AgendaModel.buscarPorProfissional.mockResolvedValue({ servicos: [] });
        const req = { params: { id: '8' } };
        const res = criarRespostaMock();

        await AgendaController.buscarPublica(req, res);

        expect(AgendaModel.buscarPorProfissional).toHaveBeenCalledWith(8);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
