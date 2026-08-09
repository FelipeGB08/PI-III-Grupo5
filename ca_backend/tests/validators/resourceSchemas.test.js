const {
    cadastroSchema,
    loginSchema,
    refreshTokenSchema,
    socialLoginSchema,
} = require('../../src/validators/authSchemas');
const {
    atualizarStatusSchema,
    chatMensagemSchema,
    criarSolicitacaoSchema,
    propostaValorSchema,
} = require('../../src/validators/solicitacaoSchemas');
const { salvarAgendaSchema } = require('../../src/validators/agendaSchemas');
const { criarAvaliacaoSchema } = require('../../src/validators/avaliacaoSchemas');
const { excluirContaSchema } = require('../../src/validators/contaSchemas');
const {
    rejeitarVerificacaoSchema,
} = require('../../src/validators/verificacaoSchemas');
const {
    favoritoListagemQuerySchema,
    chatMensagensQuerySchema,
    notificacaoListagemQuerySchema,
    paginacaoComLimitQuerySchema,
    paginacaoQuerySchema,
    solicitacaoListagemQuerySchema,
} = require('../../src/validators/paginationSchemas');
const {
    atualizarStatusUsuarioSchema,
    exportarRelatorioQuerySchema,
    listarUsuariosAdminQuerySchema,
} = require('../../src/validators/adminSchemas');
const {
    profissionalBuscaQuerySchema,
} = require('../../src/validators/profissionalSchemas');
const {
    atualizarPreferenciasNotificacaoSchema,
} = require('../../src/validators/notificationPreferenceSchemas');

function primeiraMensagem(resultado) {
    return resultado.error?.issues[0]?.message;
}

describe('schemas de autenticacao', () => {
    test('rejeita e-mail malformado no cadastro e no login', () => {
        const cadastro = cadastroSchema.safeParse({
            nome: 'Pessoa',
            email: 'invalido',
            senha: 'Segredo1234',
            cidade_amauc: 'Concordia',
            perfil_tipo: 'cidadao',
        });
        const login = loginSchema.safeParse({
            email: 'invalido',
            senha: 'Segredo1234',
        });

        expect(cadastro.success).toBe(false);
        expect(login.success).toBe(false);
        expect(primeiraMensagem(login)).toBe('Informe um e-mail valido.');
    });

    test('preserva aliases e regras do cadastro profissional', () => {
        const valido = cadastroSchema.safeParse({
            nome: 'Profissional',
            email: 'profissional@exemplo.com',
            senha: 'Segredo1234',
            cidade: 'Concordia',
            tipo_usuario: 'profissional',
            bio: 'Experiencia profissional comprovada.',
            categorias: ['TI'],
        });
        const semBiografia = cadastroSchema.safeParse({
            nome: 'Profissional',
            email: 'profissional@exemplo.com',
            senha: 'Segredo1234',
            cidade: 'Concordia',
            tipo_usuario: 'profissional',
            categorias: ['TI'],
        });

        expect(valido.success).toBe(true);
        expect(semBiografia.success).toBe(false);
    });

    test('aceita cidades atendidas no autocadastro profissional', () => {
        const resultado = cadastroSchema.safeParse({
            nome: 'Profissional Regional',
            email: 'profissional.regional@exemplo.com',
            senha: 'Segredo1234',
            cidade_amauc: 'Concordia',
            perfil_tipo: 'profissional',
            biografia: 'Experiencia profissional comprovada.',
            categoria: 'TI',
            cidades_atendidas: ['Concordia', 'Seara'],
        });

        expect(resultado.success).toBe(true);
    });

    test('rejeita perfil administrativo no autocadastro', () => {
        const resultado = cadastroSchema.safeParse({
            nome: 'Administrador Indevido',
            email: 'admin@exemplo.com',
            senha: 'SenhaSegura123',
            cidade_amauc: 'Concordia',
            perfil_tipo: 'admin',
        });

        expect(resultado.success).toBe(false);
        expect(primeiraMensagem(resultado)).toBe(
            'perfil_tipo deve ser "cidadao" ou "profissional".'
        );
    });

    test('exige refresh token opaco no refresh e logout', () => {
        expect(refreshTokenSchema.safeParse({
            refresh_token: 'r'.repeat(64),
        }).success).toBe(true);

        const invalido = refreshTokenSchema.safeParse({ refresh_token: 'curto' });
        expect(invalido.success).toBe(false);
        expect(primeiraMensagem(invalido)).toBe('Refresh token invalido.');
    });

    test('aceita somente o login Google', () => {
        expect(socialLoginSchema.safeParse({
            provider: 'google',
            token: 'google-id-token',
            cidade_amauc: 'Concordia',
        }).success).toBe(true);

        const apple = socialLoginSchema.safeParse({
            provider: 'apple',
            token: 'apple-identity-token',
        });
        expect(apple.success).toBe(false);
        expect(primeiraMensagem(apple)).toBe('provider deve ser google.');
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
            agendadoPara: '2030-01-02T17:00:00.000Z',
            atendimentoLatitude: '-27.2335',
            atendimentoLongitude: '-52.0277',
            servico_nome: 'Instalacao eletrica',
            preco: 120,
        });

        expect(resultado.success).toBe(true);
    });

    test.each([
        [{ atendimento_latitude: -27.2 }, 'Informe latitude e longitude juntas'],
        [
            { atendimento_latitude: -91, atendimento_longitude: -52.02 },
            'Latitude ou longitude do atendimento invalida',
        ],
        [
            { atendimento_latitude: -27.2, atendimento_longitude: 181 },
            'Latitude ou longitude do atendimento invalida',
        ],
    ])('rejeita coordenadas de atendimento invalidas', (localizacao, mensagem) => {
        const resultado = criarSolicitacaoSchema.safeParse({
            profissional_id: 9,
            agenda_servico_id: 12,
            descricao: 'Instalacao eletrica',
            agendado_para: '2030-01-02T17:00:00.000Z',
            ...localizacao,
        });

        expect(resultado.success).toBe(false);
        expect(primeiraMensagem(resultado)).toContain(mensagem);
    });

    test('rejeita agendamento no passado com mensagem clara', () => {
        const resultado = criarSolicitacaoSchema.safeParse({
            profissional_id: 9,
            agenda_servico_id: 12,
            descricao: 'Instalacao eletrica',
            agendado_para: '2029-12-31T17:00:00.000Z',
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

    test('aceita preco decimal valido e rejeita formatos que causariam erro no banco', () => {
        expect(salvarAgendaSchema.safeParse({
            servicos: [{ nome: 'Servico valido', duracao_minutos: 60, preco: '12.50' }],
            horarios: ['10:00'],
        }).success).toBe(true);

        const invalido = salvarAgendaSchema.safeParse({
            servicos: [{ nome: 'Servico valido', duracao_minutos: 60, preco: '12,50' }],
            horarios: ['10:00'],
        });
        expect(invalido.success).toBe(false);
        expect(primeiraMensagem(invalido)).toBe(
            'O preco de cada servico deve ser um decimal positivo valido.'
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

        const decimal = criarAvaliacaoSchema.safeParse({
            servico_id: 7,
            nota_estrelas: 4.5,
        });
        expect(decimal.success).toBe(false);
        expect(primeiraMensagem(decimal)).toBe(
            'A nota deve ser um numero inteiro entre 1 e 5.'
        );
    });
});

describe('schema de proposta de valor', () => {
    test('aceita decimal positivo e rejeita valor malformado', () => {
        expect(propostaValorSchema.safeParse({ preco: '125.50' }).success).toBe(true);
        expect(propostaValorSchema.safeParse({ preco: '125,50' }).success).toBe(false);
    });
});

describe('schema de atualizacao de status da solicitacao', () => {
    test('permite ao prestador solicitar conclusao sem definir o status intermediario diretamente', () => {
        expect(atualizarStatusSchema.safeParse({
            status: 'concluido',
        }).success).toBe(true);

        const intermediarioDireto = atualizarStatusSchema.safeParse({
            status: 'aguardando_confirmacao_cliente',
        });

        expect(intermediarioDireto.success).toBe(false);
        expect(primeiraMensagem(intermediarioDireto)).toBe(
            'Status invalido para atualizacao pelo prestador.'
        );
    });
});

describe('schema de rejeicao de verificacao profissional', () => {
    test('exige motivo claro para rejeitar documento', () => {
        expect(rejeitarVerificacaoSchema.safeParse({
            motivo_rejeicao: 'Documento ilegivel. Envie uma foto nitida.',
        }).success).toBe(true);

        const invalido = rejeitarVerificacaoSchema.safeParse({
            motivo_rejeicao: 'nao',
        });
        expect(invalido.success).toBe(false);
        expect(primeiraMensagem(invalido)).toBe(
            'O motivo da rejeicao deve ter ao menos 5 caracteres.'
        );
    });
});

describe('schema de mensagem do chat', () => {
    test('aceita identificador idempotente e rejeita mensagem ou identificador invalido', () => {
        expect(chatMensagemSchema.safeParse({
            mensagem: 'Confirmo o atendimento.',
            client_id: '1721743200000000-a1b2c3d4e5f6',
        }).success).toBe(true);
        expect(chatMensagemSchema.safeParse({
            mensagem: '   ',
            client_id: '1721743200000000-a1b2c3d4e5f6',
        }).success).toBe(false);
        expect(chatMensagemSchema.safeParse({
            mensagem: 'Teste',
            client_id: '../../arquivo.exe',
        }).success).toBe(false);
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
            status: 'aguardando_confirmacao_cliente',
        });
        const invalido = solicitacaoListagemQuerySchema.safeParse({
            page: '0',
            pageSize: '101',
        });

        expect(valido.success).toBe(true);
        expect(valido.data).toEqual({
            page: 2,
            pageSize: 100,
            status: 'aguardando_confirmacao_cliente',
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

    test('valida aliases page/limit das outras listagens paginadas', () => {
        expect(paginacaoComLimitQuerySchema.safeParse({
            pagina: '2',
            tamanho: '50',
        }).success).toBe(true);
        expect(paginacaoComLimitQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
        expect(notificacaoListagemQuerySchema.safeParse({
            page: '1',
            limit: '20',
            nao_lidas: 'true',
        }).success).toBe(true);
        expect(chatMensagensQuerySchema.safeParse({
            before_id: '10',
            limit: '100',
        }).success).toBe(true);
        expect(chatMensagensQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
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

describe('schemas de denuncias', () => {
    test('valida motivo, descricao e resolucao administrativa obrigatoria', () => {
        const {
            atualizarDenunciaSchema,
            criarDenunciaSchema,
            listarDenunciasQuerySchema,
        } = require('../../src/validators/denunciaSchemas');

        expect(criarDenunciaSchema.safeParse({
            motivo: 'cobranca_indevida',
            descricao: 'Foi cobrado um valor diferente do combinado.',
        }).success).toBe(true);
        expect(criarDenunciaSchema.safeParse({
            motivo: 'invalido',
            descricao: 'curta',
        }).success).toBe(false);
        expect(listarDenunciasQuerySchema.safeParse({ status: 'em_analise' }).success).toBe(true);
        expect(listarDenunciasQuerySchema.safeParse({ status: 'qualquer' }).success).toBe(false);
        expect(atualizarDenunciaSchema.safeParse({ status: 'resolvida' }).success).toBe(false);
        expect(atualizarDenunciaSchema.safeParse({
            status: 'resolvida',
            resolucao_admin: 'A administracao analisou e encerrou o caso.',
        }).success).toBe(true);
    });
});

describe('schemas administrativos', () => {
    test('normaliza pagina, filtro e busca da lista de usuarios', () => {
        const resultado = listarUsuariosAdminQuerySchema.safeParse({
            page: '2',
            pageSize: '50',
            perfil_tipo: 'profissional',
            busca: '  ana  ',
        });

        expect(resultado).toEqual(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                page: 2,
                pageSize: 50,
                perfil_tipo: 'profissional',
                busca: 'ana',
            }),
        }));
    });

    test('rejeita filtro administrativo e tamanho de pagina invalidos', () => {
        expect(listarUsuariosAdminQuerySchema.safeParse({
            perfil_tipo: 'root',
        }).success).toBe(false);
        expect(listarUsuariosAdminQuerySchema.safeParse({
            pageSize: '101',
        }).success).toBe(false);
    });

    test('aceita somente status booleano e exportacao CSV', () => {
        expect(atualizarStatusUsuarioSchema.safeParse({ ativo: 'false' }))
            .toEqual(expect.objectContaining({ success: true, data: { ativo: false } }));
        expect(atualizarStatusUsuarioSchema.safeParse({ ativo: 'nao' }).success)
            .toBe(false);
        expect(exportarRelatorioQuerySchema.safeParse({ formato: 'csv' }).success)
            .toBe(true);
        expect(exportarRelatorioQuerySchema.safeParse({ formato: 'json' }).success)
            .toBe(false);
    });
});

describe('schema de filtros publicos de profissionais', () => {
    test('converte filtros avancados validos e preserva a data ISO', () => {
        const resultado = profissionalBuscaQuerySchema.safeParse({
            preco_min: '80.50',
            preco_max: '250',
            nota_minima: '4.5',
            disponivel_em: '2030-06-10',
        });

        expect(resultado).toEqual(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                preco_min: 80.5,
                preco_max: 250,
                nota_minima: 4.5,
                disponivel_em: '2030-06-10',
            }),
        }));
    });

    test.each([
        [{ preco_min: '-1' }],
        [{ preco_min: '250', preco_max: '80' }],
        [{ nota_minima: '5.1' }],
        [{ disponivel_em: '10/06/2030' }],
        [{ disponivel_em: '2030-02-30' }],
    ])('rejeita filtro avancado invalido: %o', (query) => {
        expect(profissionalBuscaQuerySchema.safeParse(query).success).toBe(false);
    });
});

describe('schema de preferência de notificações', () => {
    test('aceita somente o booleano da preferência de horários favoritos', () => {
        expect(atualizarPreferenciasNotificacaoSchema.safeParse({
            novos_horarios_favoritos: false,
        }).success).toBe(true);
        expect(atualizarPreferenciasNotificacaoSchema.safeParse({
            novos_horarios_favoritos: 'false',
        }).success).toBe(false);
        expect(atualizarPreferenciasNotificacaoSchema.safeParse({
            novos_horarios_favoritos: true,
            outra_preferencia: true,
        }).success).toBe(false);
    });
});
