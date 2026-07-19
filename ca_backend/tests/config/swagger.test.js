const swaggerSpec = require('../../src/config/swagger');

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
});
