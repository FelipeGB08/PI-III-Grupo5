const {
    cadastroSchema,
    loginSchema,
    refreshTokenSchema,
} = require('../../src/validators/authSchemas');
const { criarSolicitacaoSchema } = require('../../src/validators/solicitacaoSchemas');
const { salvarAgendaSchema } = require('../../src/validators/agendaSchemas');
const { criarAvaliacaoSchema } = require('../../src/validators/avaliacaoSchemas');
const { excluirContaSchema } = require('../../src/validators/contaSchemas');
const {
    favoritoListagemQuerySchema,
    paginacaoQuerySchema,
    solicitacaoListagemQuerySchema,
} = require('../../src/validators/paginationSchemas');

function primeiraMensagem(resultado) {
    return resultado.error?.issues[0]?.message;
}

describe('schemas de autenticacao', () => {
    test('rejeita e-mail malformado no cadastro e no login', () => {
        const cadastro = cadastroSchema.safeParse({
            nome: 'Pessoa',
            email: 'invalido',
            senha: 'segredo',
            cidade_amauc: 'Concordia',
            perfil_tipo: 'cidadao',
        });
        const login = loginSchema.safeParse({
            email: 'invalido',
            senha: 'segredo',
        });

        expect(cadastro.success).toBe(false);
        expect(login.success).toBe(false);
        expect(primeiraMensagem(login)).toBe('Informe um e-mail valido.');
    });

    test('preserva aliases e regras do cadastro profissional', () => {
        const valido = cadastroSchema.safeParse({
            nome: 'Profissional',
            email: 'profissional@exemplo.com',
            senha: 'segredo',
            cidade: 'Concordia',
            tipo_usuario: 'profissional',
            bio: 'Experiencia profissional comprovada.',
            categorias: ['TI'],
        });
        const semBiografia = cadastroSchema.safeParse({
            nome: 'Profissional',
            email: 'profissional@exemplo.com',
            senha: 'segredo',
            cidade: 'Concordia',
            tipo_usuario: 'profissional',
            categorias: ['TI'],
        });

        expect(valido.success).toBe(true);
        expect(semBiografia.success).toBe(false);
    });

    test('exige refresh token opaco no refresh e logout', () => {
        expect(refreshTokenSchema.safeParse({
            refresh_token: 'r'.repeat(64),
        }).success).toBe(true);

        const invalido = refreshTokenSchema.safeParse({ refresh_token: 'curto' });
        expect(invalido.success).toBe(false);
        expect(primeiraMensagem(invalido)).toBe('Refresh token invalido.');
    });
});

describe('schema de solicitacao', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2030-01-01T10:00:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('aceita aliases do payload de agendamento', () => {
        const resultado = criarSolicitacaoSchema.safeParse({
            prestador_id: '9',
            agenda_servico_id: '12',
            descricao: 'Instalacao eletrica',
            agendadoPara: '2030-01-02T14:00:00',
        });

        expect(resultado.success).toBe(true);
    });

    test('rejeita agendamento no passado com mensagem clara', () => {
        const resultado = criarSolicitacaoSchema.safeParse({
            profissional_id: 9,
            agenda_servico_id: 12,
            descricao: 'Instalacao eletrica',
            agendado_para: '2029-12-31T14:00:00',
        });

        expect(resultado.success).toBe(false);
        expect(primeiraMensagem(resultado)).toBe(
            'Nao e permitido agendar em horario passado.'
        );
    });
});

describe('schema de agenda', () => {
    test('aceita servicos e horarios nos formatos usados pelo app', () => {
        const resultado = salvarAgendaSchema.safeParse({
            servicos: [
                { nome: 'Corte de cabelo', duracaoMinutos: 60, preco: '50' },
            ],
            horarios: [
                { diaSemana: 2, horario: '10:00' },
                { dia_semana: 8, horario: '11:00' },
            ],
        });

        expect(resultado.success).toBe(true);
    });

    test('rejeita servico e agenda sem horario valido', () => {
        const servicoInvalido = salvarAgendaSchema.safeParse({
            servicos: [{ nome: 'AB', duracao_minutos: 10, preco: 0 }],
            horarios: ['09:00'],
        });
        const horarioInvalido = salvarAgendaSchema.safeParse({
            servicos: [
                { nome: 'Servico valido', duracao_minutos: 60, preco: 100 },
            ],
            horarios: ['25:00'],
        });

        expect(servicoInvalido.success).toBe(false);
        expect(horarioInvalido.success).toBe(false);
        expect(primeiraMensagem(horarioInvalido)).toBe(
            'Informe ao menos um horario valido.'
        );
    });
});

describe('schema de avaliacao', () => {
    test('aceita aliases e limita a nota entre 1 e 5', () => {
        expect(criarAvaliacaoSchema.safeParse({
            solicitacao_id: 7,
            nota: 5,
            comentario: 'Otimo atendimento',
        }).success).toBe(true);

        const invalido = criarAvaliacaoSchema.safeParse({
            servico_id: 7,
            nota_estrelas: 6,
        });
        expect(invalido.success).toBe(false);
        expect(primeiraMensagem(invalido)).toBe(
            'A nota deve ser um numero inteiro entre 1 e 5.'
        );
    });
});

describe('schemas de paginacao', () => {
    test('aplica pagina e tamanho padrao', () => {
        const resultado = paginacaoQuerySchema.safeParse({});

        expect(resultado.success).toBe(true);
        expect(resultado.data).toEqual({ page: 1, pageSize: 20 });
    });

    test('converte query string e limita pageSize a 100', () => {
        const valido = solicitacaoListagemQuerySchema.safeParse({
            page: '2',
            pageSize: '100',
            status: 'concluido',
        });
        const invalido = solicitacaoListagemQuerySchema.safeParse({
            page: '0',
            pageSize: '101',
        });

        expect(valido.success).toBe(true);
        expect(valido.data).toEqual({
            page: 2,
            pageSize: 100,
            status: 'concluido',
        });
        expect(invalido.success).toBe(false);
    });

    test('valida coordenadas da listagem de favoritos', () => {
        expect(favoritoListagemQuerySchema.safeParse({
            lat: '-27.23',
            lng: '-52.03',
        }).success).toBe(true);

        expect(favoritoListagemQuerySchema.safeParse({
            lat: '91',
            lng: '-52.03',
        }).success).toBe(false);
    });
});

describe('schema de exclusao de conta', () => {
    test('exige a frase de confirmacao irreversivel', () => {
        expect(excluirContaSchema.safeParse({
            confirmacao: 'EXCLUIR MINHA CONTA',
        }).success).toBe(true);

        const invalido = excluirContaSchema.safeParse({
            confirmacao: 'excluir',
        });
        expect(invalido.success).toBe(false);
        expect(primeiraMensagem(invalido)).toBe(
            'Para excluir a conta, digite EXCLUIR MINHA CONTA.'
        );
    });
});
