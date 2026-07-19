const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const API_PREFIX_V1 = '/api/v1';

function normalizarServidorV1(url) {
    const semBarraFinal = String(url || '').replace(/\/$/, '');
    const semPrefixoAntigo = semBarraFinal.replace(/\/api(?:\/v1)?$/, '');
    return `${semPrefixoAntigo}${API_PREFIX_V1}`;
}

function normalizarCaminhoV1(caminho) {
    if (caminho === '/api') return '/';
    if (caminho.startsWith(`${API_PREFIX_V1}/`)) {
        return caminho.slice(API_PREFIX_V1.length);
    }
    if (caminho.startsWith('/api/')) return caminho.slice('/api'.length);
    return caminho;
}

const servidorDocumentacao = normalizarServidorV1(
    process.env.API_DOCS_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`
);

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Conecta AMAUC API',
            version: '1.0.0',
            description: 'API REST v1 para conectar cidadãos e profissionais da região AMAUC.',
        },
        servers: [
            {
                url: servidorDocumentacao,
                description: 'API v1',
            },
        ],
        tags: [
            { name: 'Auth', description: 'Cadastro, login e sessões' },
            { name: 'Usuários', description: 'Conta e perfil do usuário' },
            { name: 'Perfis', description: 'Perfil profissional e busca autenticada' },
            { name: 'Profissionais', description: 'Consulta pública de profissionais' },
            { name: 'Agenda', description: 'Serviços e horários do profissional' },
            { name: 'Serviços', description: 'Compatibilidade com o fluxo legado de serviços' },
            { name: 'Solicitações', description: 'Chamados, status, propostas e remarcações' },
            { name: 'Chat', description: 'Mensagens dos chamados' },
            { name: 'Avaliações', description: 'Avaliações de serviços concluídos' },
            { name: 'Categorias', description: 'Categorias de serviço' },
            { name: 'Favoritos', description: 'Profissionais favoritos' },
            { name: 'Notificações', description: 'Central de notificações' },
            { name: 'Dispositivos', description: 'Tokens de push notification' },
            { name: 'Uploads', description: 'Upload de imagens' },
            { name: 'Admin', description: 'Operações administrativas' },
            { name: 'Status', description: 'Saúde da API' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Access token JWT retornado pelo login.',
                },
            },
            schemas: {
                Erro: {
                    type: 'object',
                    required: ['erro'],
                    properties: { erro: { type: 'string' } },
                    example: { erro: 'Erro interno no servidor.' },
                },
                Mensagem: {
                    type: 'object',
                    properties: { mensagem: { type: 'string' } },
                    example: { mensagem: 'Operação realizada com sucesso.' },
                },
                Usuario: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 12 },
                        nome: { type: 'string', example: 'Maria da Silva' },
                        email: { type: 'string', format: 'email', example: 'maria@exemplo.com' },
                        telefone: { type: 'string', nullable: true, example: '(49) 99999-0000' },
                        cidade_amauc: { type: 'string', example: 'Concórdia' },
                        endereco_principal: { type: 'string', nullable: true, example: 'Rua das Flores, 123' },
                        latitude: { type: 'number', nullable: true, example: -27.2342 },
                        longitude: { type: 'number', nullable: true, example: -52.0277 },
                        perfil_tipo: { type: 'string', enum: ['cidadao', 'profissional', 'admin'] },
                        tipo_usuario: { type: 'string', enum: ['cidadao', 'profissional', 'admin'] },
                        foto_url: { type: 'string', nullable: true, example: '/uploads/avatar.jpg' },
                    },
                },
                AuthSession: {
                    type: 'object',
                    properties: {
                        mensagem: { type: 'string', example: 'Login realizado com sucesso!' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
                        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
                        refresh_token: { type: 'string', example: 'token-opaco-de-refresh' },
                        expires_in: { type: 'integer', example: 900 },
                        usuario: { $ref: '#/components/schemas/Usuario' },
                    },
                },
                CadastroRequest: {
                    type: 'object',
                    required: ['nome', 'email', 'senha', 'cidade_amauc', 'perfil_tipo'],
                    properties: {
                        nome: { type: 'string', example: 'Maria da Silva' },
                        email: { type: 'string', format: 'email', example: 'maria@exemplo.com' },
                        senha: { type: 'string', format: 'password', minLength: 6, example: 'Teste123456' },
                        telefone: { type: 'string', example: '(49) 99999-0000' },
                        cidade_amauc: { type: 'string', example: 'Concórdia' },
                        endereco_principal: { type: 'string', example: 'Rua das Flores, 123' },
                        latitude: { type: 'number', example: -27.2342 },
                        longitude: { type: 'number', example: -52.0277 },
                        perfil_tipo: { type: 'string', enum: ['cidadao', 'profissional'] },
                        biografia: { type: 'string', description: 'Obrigatória para profissional.' },
                        categoria: { type: 'string', description: 'Obrigatória para profissional.', example: 'TI' },
                        cidades_atendidas: { type: 'array', items: { type: 'string' } },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'senha'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'maria@exemplo.com' },
                        senha: { type: 'string', format: 'password', example: 'Teste123456' },
                    },
                },
                SocialLoginRequest: {
                    type: 'object',
                    required: ['provider', 'token'],
                    properties: {
                        provider: { type: 'string', enum: ['google', 'apple', 'github'] },
                        token: { type: 'string', example: 'token-do-provedor' },
                        cidade_amauc: { type: 'string', example: 'Concórdia' },
                    },
                },
                RefreshTokenRequest: {
                    type: 'object',
                    required: ['refresh_token'],
                    properties: { refresh_token: { type: 'string', minLength: 32 } },
                    example: { refresh_token: 'token-opaco-de-refresh' },
                },
                EmailRequest: {
                    type: 'object', required: ['email'],
                    properties: { email: { type: 'string', format: 'email', example: 'maria@exemplo.com' } },
                },
                TokenRequest: {
                    type: 'object', required: ['token'],
                    properties: { token: { type: 'string', example: 'token-recebido-por-email' } },
                },
                ResetSenhaRequest: {
                    type: 'object', required: ['token', 'senha'],
                    properties: {
                        token: { type: 'string', example: 'token-recebido-por-email' },
                        senha: { type: 'string', format: 'password', minLength: 6, example: 'NovaSenha123' },
                    },
                },
                Categoria: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 3 },
                        nome_servico: { type: 'string', example: 'Eletricista' },
                    },
                },
                CategoriaRequest: {
                    type: 'object', required: ['nome_servico'],
                    properties: { nome_servico: { type: 'string', example: 'Eletricista' } },
                },
                AgendaServico: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', nullable: true, example: 8 },
                        nome: { type: 'string', example: 'Visita técnica' },
                        duracao_minutos: { type: 'integer', example: 60 },
                        preco: { type: 'number', format: 'double', example: 120 },
                        ativo: { type: 'boolean', example: true },
                        ordem: { type: 'integer', example: 0 },
                    },
                },
                AgendaHorario: {
                    type: 'object',
                    properties: {
                        dia_semana: { type: 'integer', minimum: 1, maximum: 7, example: 2 },
                        horario: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '10:00' },
                    },
                },
                Agenda: {
                    type: 'object',
                    properties: {
                        usando_padrao: { type: 'boolean' },
                        servicos: { type: 'array', items: { $ref: '#/components/schemas/AgendaServico' } },
                        horarios: { type: 'array', items: { $ref: '#/components/schemas/AgendaHorario' } },
                        dias_semana: { type: 'array', items: { type: 'integer' } },
                    },
                },
                AgendaRequest: {
                    type: 'object', required: ['servicos', 'horarios'],
                    properties: {
                        servicos: { type: 'array', items: { $ref: '#/components/schemas/AgendaServico' } },
                        horarios: { type: 'array', items: { $ref: '#/components/schemas/AgendaHorario' } },
                    },
                },
                PerfilProfissional: {
                    type: 'object', additionalProperties: true,
                    properties: {
                        usuario_id: { type: 'integer', example: 20 },
                        biografia: { type: 'string', example: 'Profissional com experiência regional.' },
                        anos_experiencia: { type: 'integer', example: 7 },
                        curriculo_texto: { type: 'string', nullable: true },
                        portfolio_url: { type: 'string', nullable: true },
                        portfolio_fotos: { type: 'array', items: { type: 'string' } },
                        certificacoes: { type: 'array', items: { type: 'string' } },
                        cidades_atendidas: { type: 'array', items: { type: 'string' } },
                        atende_rural: { type: 'boolean' },
                        atende_emergencia: { type: 'boolean' },
                        possui_veiculo: { type: 'boolean' },
                        taxa_deslocamento: { type: 'number', nullable: true },
                    },
                },
                PerfilRequest: {
                    type: 'object',
                    properties: {
                        biografia: { type: 'string', example: 'Profissional com experiência regional.' },
                        anos_experiencia: { type: 'integer', minimum: 0, example: 7 },
                        curriculo_texto: { type: 'string' },
                        portfolio_url: { type: 'string' },
                        portfolio_fotos: { type: 'array', items: { type: 'string' } },
                        certificacoes: { type: 'array', items: { type: 'string' } },
                        categoria: { type: 'string', example: 'TI' },
                        cidade_amauc: { type: 'string', example: 'Concórdia' },
                        cidades_atendidas: { type: 'array', items: { type: 'string' } },
                        atende_rural: { type: 'boolean' },
                        atende_emergencia: { type: 'boolean' },
                        possui_veiculo: { type: 'boolean' },
                        taxa_deslocamento: { type: 'number' },
                    },
                },
                Profissional: {
                    allOf: [
                        { $ref: '#/components/schemas/Usuario' },
                        { $ref: '#/components/schemas/PerfilProfissional' },
                    ],
                },
                Solicitacao: {
                    type: 'object', additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 101 },
                        cidadao_id: { type: 'integer', example: 12 },
                        prof_id: { type: 'integer', example: 20 },
                        agenda_servico_id: { type: 'integer', nullable: true, example: 8 },
                        servico_nome: { type: 'string', example: 'Visita técnica' },
                        descricao: { type: 'string', example: 'Instalação de tomada' },
                        endereco_atendimento: { type: 'string', nullable: true, example: 'Rua das Flores, 123' },
                        agendado_para: { type: 'string', format: 'date-time' },
                        preco: { type: 'number', example: 120 },
                        status: { type: 'string', example: 'pendente' },
                        fotos_conclusao: { type: 'array', items: { type: 'string' } },
                    },
                },
                SolicitacaoRequest: {
                    type: 'object',
                    required: ['profissional_id', 'agenda_servico_id', 'descricao', 'agendado_para'],
                    properties: {
                        profissional_id: { type: 'integer', example: 20 },
                        agenda_servico_id: { type: 'integer', example: 8 },
                        descricao: { type: 'string', example: 'Instalação de tomada' },
                        endereco_atendimento: { type: 'string', example: 'Rua das Flores, 123' },
                        agendado_para: { type: 'string', format: 'date-time', example: '2030-05-20T10:00:00' },
                    },
                },
                StatusRequest: {
                    type: 'object', required: ['status'],
                    properties: {
                        status: { type: 'string', enum: ['aceito', 'recusado', 'concluido'] },
                    },
                },
                PropostaValorRequest: {
                    type: 'object', required: ['preco'],
                    properties: {
                        preco: { type: 'number', example: 150 },
                        preco_proposto: { type: 'number', description: 'Alias de preco.' },
                        motivo: { type: 'string', example: 'Material adicional necessário.' },
                    },
                },
                CancelamentoRequest: {
                    type: 'object',
                    properties: { motivo: { type: 'string', example: 'Não precisarei mais do serviço.' } },
                },
                RemarcacaoRequest: {
                    type: 'object', required: ['nova_data_hora'],
                    properties: {
                        nova_data_hora: { type: 'string', format: 'date-time', example: '2030-05-20T14:00:00' },
                        motivo: { type: 'string', example: 'Ajuste de horário.' },
                    },
                },
                ChatMensagem: {
                    type: 'object', additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 44 },
                        servico_id: { type: 'integer', example: 101 },
                        remetente_id: { type: 'integer', example: 12 },
                        mensagem: { type: 'string', example: 'Podemos confirmar os detalhes?' },
                        criado_em: { type: 'string', format: 'date-time' },
                    },
                },
                ChatMensagemRequest: {
                    type: 'object', required: ['mensagem'],
                    properties: { mensagem: { type: 'string', example: 'Podemos confirmar os detalhes?' } },
                },
                Avaliacao: {
                    type: 'object', additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 30 },
                        servico_id: { type: 'integer', example: 101 },
                        nota_estrelas: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                        comentario: { type: 'string', example: 'Ótimo atendimento.' },
                    },
                },
                AvaliacaoRequest: {
                    type: 'object', required: ['servico_id', 'nota_estrelas'],
                    properties: {
                        servico_id: { type: 'integer', example: 101 },
                        nota_estrelas: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                        comentario: { type: 'string', example: 'Ótimo atendimento.' },
                    },
                },
                DeviceTokenRequest: {
                    type: 'object', required: ['token'],
                    properties: {
                        token: { type: 'string', example: 'fcm-device-token' },
                        plataforma: { type: 'string', enum: ['android', 'ios', 'web'], example: 'android' },
                    },
                },
                Notificacao: {
                    type: 'object', additionalProperties: true,
                    properties: {
                        id: { type: 'integer', example: 70 },
                        tipo: { type: 'string', example: 'novo_chamado' },
                        titulo: { type: 'string', example: 'Novo chamado recebido' },
                        corpo: { type: 'string' },
                        lida_em: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
                AtualizarUsuarioRequest: {
                    type: 'object',
                    properties: {
                        nome: { type: 'string', minLength: 2 },
                        telefone: { type: 'string' },
                        foto_url: { type: 'string' },
                        endereco_principal: { type: 'string' },
                        latitude: { type: 'number' },
                        longitude: { type: 'number' },
                    },
                },
            },
            responses: {
                BadRequest: {
                    description: 'Dados inválidos.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Dados enviados sao invalidos.' } } },
                },
                Unauthorized: {
                    description: 'Access token ausente, expirado ou credenciais inválidas.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Acesso negado. Token nao fornecido.' } } },
                },
                Forbidden: {
                    description: 'Perfil sem permissão para a operação.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Acesso negado para este perfil de usuario.' } } },
                },
                TooManyRequests: {
                    description: 'Limite de requisicoes atingido para o usuario autenticado. Consulte os headers RateLimit-* e Retry-After.',
                    headers: {
                        'RateLimit-Limit': { schema: { type: 'integer' }, description: 'Quantidade maxima na janela.' },
                        'RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Quantidade restante na janela.' },
                        'RateLimit-Reset': { schema: { type: 'integer' }, description: 'Momento de renovacao da janela (Unix timestamp).' },
                        'Retry-After': { schema: { type: 'integer' }, description: 'Segundos para tentar novamente.' },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Erro' },
                            example: { erro: 'Limite de envio de mensagens atingido. Aguarde um minuto e tente novamente.' },
                        },
                    },
                },
                NotFound: {
                    description: 'Recurso não encontrado.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Recurso nao encontrado.' } } },
                },
                InternalError: {
                    description: 'Erro interno.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' }, example: { erro: 'Erro interno no servidor.' } } },
                },
            },
        },
    },
    apis: [
        path.join(__dirname, '..', 'routes', '*.js').replace(/\\/g, '/'),
        path.join(__dirname, '..', 'server.js').replace(/\\/g, '/'),
    ],
});

swaggerSpec.paths = Object.fromEntries(
    Object.entries(swaggerSpec.paths || {}).map(([caminho, item]) => [
        normalizarCaminhoV1(caminho),
        item,
    ])
);

const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
for (const pathItem of Object.values(swaggerSpec.paths || {})) {
    for (const method of httpMethods) {
        const operation = pathItem[method];
        const usaBearer = operation?.security?.some((item) => item.bearerAuth);
        if (!usaBearer) continue;

        operation.responses ||= {};
        operation.responses['401'] ||= {
            $ref: '#/components/responses/Unauthorized',
        };
        operation.responses['403'] ||= {
            $ref: '#/components/responses/Forbidden',
        };
    }
}

module.exports = swaggerSpec;
