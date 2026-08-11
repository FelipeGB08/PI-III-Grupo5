const { normalizarEmailIdentidade } = require('../../src/utils/emailIdentity');

describe('normalizarEmailIdentidade', () => {
    test('remove variações equivalentes de endereços Gmail', () => {
        expect(normalizarEmailIdentidade('  Nome.Sobrenome+teste@googlemail.com '))
            .toBe('nomesobrenome@gmail.com');
    });

    test('mantém a parte local de provedores que não são Gmail', () => {
        expect(normalizarEmailIdentidade('Nome.Sobrenome+teste@empresa.com'))
            .toBe('nome.sobrenome+teste@empresa.com');
    });
});
