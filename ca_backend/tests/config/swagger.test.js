const swaggerSpec = require('../../src/config/swagger');
const { listarOperacoesDeclaradas } = require('../../src/config/apiRoutes');

const metodosHttp = ['get', 'post', 'put', 'patch', 'delete'];

function listarOperacoesDocumentadas() {
    return Object.entries(swaggerSpec.paths || {}).flatMap(([caminho, item]) =>
        metodosHttp
            .filter((method) => item[method])
            .map((method) => `${method}:${caminho}`)
    );
}

function coletarReferencias(valor, caminho = '$', resultado = []) {
    if (!valor || typeof valor !== 'object') return resultado;

    if (typeof valor.$ref === 'string') {
        resultado.push({ ref: valor.$ref, caminho });
    }

    for (const [chave, item] of Object.entries(valor)) {
        coletarReferencias(item, `${caminho}.${chave}`, resultado);
    }
    return resultado;
}

function resolverReferenciaLocal(ref) {
    if (!ref.startsWith('#/')) return undefined;

    return ref
        .slice(2)
        .split('/')
        .map((parte) => parte.replace(/~1/g, '/').replace(/~0/g, '~'))
        .reduce((atual, parte) => atual?.[parte], swaggerSpec);
}

describe('Swagger da API versionada', () => {
    test('publica a especificacao usando o servidor /api/v1', () => {
        expect(swaggerSpec.servers).toEqual(expect.arrayContaining([
            expect.objectContaining({
                url: expect.stringMatching(/\/api\/v1$/),
            }),
        ]));
    });

    test('mantem os caminhos relativos ao prefixo v1, sem expor o alias legado', () => {
        const caminhos = Object.keys(swaggerSpec.paths || {});

        expect(caminhos).toContain('/status');
        expect(caminhos.some((caminho) => caminho === '/api' || caminho.startsWith('/api/')))
            .toBe(false);
    });

    test('documenta o perfil publico sem dados pessoais ou credenciais', () => {
        const schema = swaggerSpec.components.schemas.ProfissionalPublico;

        expect(schema).toBeDefined();
        expect(schema.properties).toEqual(expect.objectContaining({
            nome: expect.any(Object),
            cidade_amauc: expect.any(Object),
            categorias: expect.any(Object),
            verificado: expect.objectContaining({ type: 'boolean' }),
            media_avaliacao: expect.any(Object),
            distancia_km: expect.any(Object),
            latitude: expect.any(Object),
            longitude: expect.any(Object),
            localizacao_aproximada: expect.any(Object),
        }));

        for (const campo of [
            'email',
            'telefone',
            'senha',
            'senha_hash',
            'token',
            'refresh_token',
            'documento_url',
            'revisado_por',
        ]) {
            expect(schema.properties).not.toHaveProperty(campo);
        }
    });

    test('mantem as operacoes do Swagger iguais as rotas realmente declaradas', () => {
        const operacoesReais = listarOperacoesDeclaradas()
            .map((operacao) => `${operacao.method}:${operacao.path}`)
            .sort();

        expect(listarOperacoesDocumentadas().sort()).toEqual(operacoesReais);
    });

    test('documenta resposta 429 em toda rota com rate limit', () => {
        for (const operacao of listarOperacoesDeclaradas()) {
            if (!operacao.rateLimited) continue;

            expect(swaggerSpec.paths[operacao.path][operacao.method].responses)
                .toHaveProperty('429');
        }
    });

    test('nao contem referencias locais quebradas', () => {
        const quebradas = coletarReferencias(swaggerSpec)
            .filter(({ ref }) => ref.startsWith('#/') && resolverReferenciaLocal(ref) === undefined);

        expect(quebradas).toEqual([]);
    });

    test.each([
        ['get', '/avaliacoes/profissional/{id}'],
        ['get', '/favoritos'],
        ['get', '/notificacoes'],
        ['get', '/perfil/busca'],
        ['get', '/profissionais'],
        ['get', '/solicitacoes/meus-pedidos'],
        ['get', '/solicitacoes/minhas-solicitacoes'],
        ['get', '/solicitacoes/financeiro'],
    ])('documenta 400 para paginacao invalida em %s %s', (metodo, caminho) => {
        expect(swaggerSpec.paths[caminho][metodo].responses).toHaveProperty('400');
    });

    test('documenta somente Google no contrato de login social', () => {
        const socialLogin = swaggerSpec.components.schemas.SocialLoginRequest;
        expect(socialLogin.properties.provider.enum).toEqual(['google']);
        expect(swaggerSpec.paths).not.toHaveProperty('/auth/apple/config');
        expect(swaggerSpec.paths).not.toHaveProperty('/auth/github/authorize');
    });
});
