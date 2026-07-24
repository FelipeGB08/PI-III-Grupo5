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

    test.each([
        ['get', '/auth/apple/config', ['200', '400', '500', '503']],
        ['post', '/auth/apple/callback', ['303', '400', '500']],
        ['get', '/auth/github/authorize', ['302', '400', '403', '429', '500', '503']],
        ['get', '/auth/github/callback', ['303', '400', '401', '500', '503']],
        ['post', '/auth/github/complete', ['200', '400', '401', '429', '500']],
    ])('documenta respostas obrigatorias em %s %s', (metodo, caminho, statusEsperados) => {
        expect(Object.keys(swaggerSpec.paths[caminho][metodo].responses))
            .toEqual(expect.arrayContaining(statusEsperados));
    });

    test('documenta o contrato de contexto por plataforma do login Apple', () => {
        const socialLogin = swaggerSpec.components.schemas.SocialLoginRequest;
        const respostaConfig = swaggerSpec.paths['/auth/apple/config']
            .get.responses['200'].content['application/json'].schema;

        expect(socialLogin.properties).toEqual(expect.objectContaining({
            platform: expect.objectContaining({ enum: ['ios', 'android', 'web'] }),
            state: expect.any(Object),
            nonce: expect.any(Object),
        }));
        const varianteApple = socialLogin.allOf
            .flatMap((regra) => regra.oneOf || [])
            .find((regra) => regra.title === 'Apple');
        expect(varianteApple.required).toEqual(expect.arrayContaining([
            'platform',
            'state',
            'nonce',
        ]));
        expect(respostaConfig.required).toEqual(expect.arrayContaining([
            'client_id',
            'platform',
            'state',
            'nonce',
            'expires_in',
        ]));
    });
});
