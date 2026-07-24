const { apiDocsEnabled } = require('../../src/config/apiDocs');

describe('apiDocsEnabled', () => {
    test('desabilita Swagger por padrao em producao', () => {
        expect(apiDocsEnabled({ NODE_ENV: 'production' })).toBe(false);
        expect(apiDocsEnabled({ NODE_ENV: 'production', ENABLE_API_DOCS: 'false' }))
            .toBe(false);
    });

    test('permite habilitacao explicita em producao', () => {
        expect(apiDocsEnabled({ NODE_ENV: 'production', ENABLE_API_DOCS: 'true' }))
            .toBe(true);
    });

    test('mantem os docs no desenvolvimento, salvo desabilitacao explicita', () => {
        expect(apiDocsEnabled({ NODE_ENV: 'development' })).toBe(true);
        expect(apiDocsEnabled({ NODE_ENV: 'development', ENABLE_API_DOCS: 'false' }))
            .toBe(false);
    });
});
