const servicoRoutes = require('../../src/routes/servicoRoutes');
const solicitacaoRoutes = require('../../src/routes/solicitacaoRoutes');
const avaliacaoRoutes = require('../../src/routes/avaliacaoRoutes');
const perfilRoutes = require('../../src/routes/perfilRoutes');
const adminCategoriaRoutes = require('../../src/routes/adminCategoriaRoutes');
const relatorioRoutes = require('../../src/routes/relatorioRoutes');
const verificarToken = require('../../src/middlewares/authMiddleware');

function obterHandlers(router, metodo, caminho) {
    const camada = router.stack.find((item) => (
        item.route?.path === caminho && item.route.methods[metodo]
    ));
    return camada.route.stack.map((item) => item.handle);
}

function executarMiddleware(middleware, perfil) {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
    const next = jest.fn();

    middleware({ usuarioLogado: { id: 1, perfil_tipo: perfil } }, res, next);
    return { res, next };
}

const rotasComPapel = [
    [servicoRoutes, 'post', '/', 'cidadao'],
    [servicoRoutes, 'put', '/:id/status', 'profissional'],
    [avaliacaoRoutes, 'post', '/', 'cidadao'],
    [solicitacaoRoutes, 'post', '/', 'cidadao'],
    [solicitacaoRoutes, 'get', '/meus-pedidos', 'cidadao'],
    [solicitacaoRoutes, 'get', '/minhas-solicitacoes', 'profissional'],
    [solicitacaoRoutes, 'post', '/:id/fotos-conclusao', 'profissional'],
    [adminCategoriaRoutes, 'get', '/denuncias', 'admin'],
    [adminCategoriaRoutes, 'get', '/denuncias/:id', 'admin'],
    [adminCategoriaRoutes, 'patch', '/denuncias/:id', 'admin'],
    [perfilRoutes, 'post', '/verificacao', 'profissional'],
    [perfilRoutes, 'get', '/verificacao', 'profissional'],
    [perfilRoutes, 'get', '/verificacao/documento', 'profissional'],
    [solicitacaoRoutes, 'patch', '/:id/status', 'profissional'],
    [solicitacaoRoutes, 'patch', '/:id/proposta-valor', 'profissional'],
    [solicitacaoRoutes, 'patch', '/:id/proposta-valor/aceitar', 'cidadao'],
    [solicitacaoRoutes, 'patch', '/:id/proposta-valor/recusar', 'cidadao'],
    [solicitacaoRoutes, 'patch', '/:id/cancelar', 'cidadao'],
    [solicitacaoRoutes, 'patch', '/:id/remarcar', 'profissional'],
    [solicitacaoRoutes, 'patch', '/:id/remarcacao/aceitar', 'cidadao'],
    [solicitacaoRoutes, 'patch', '/:id/remarcacao/recusar', 'cidadao'],
    [adminCategoriaRoutes, 'get', '/verificacoes', 'admin'],
    [adminCategoriaRoutes, 'get', '/verificacoes/:id/documento', 'admin'],
    [adminCategoriaRoutes, 'patch', '/verificacoes/:id/aprovar', 'admin'],
    [adminCategoriaRoutes, 'patch', '/verificacoes/:id/rejeitar', 'admin'],
    [adminCategoriaRoutes, 'get', '/usuarios', 'admin'],
    [adminCategoriaRoutes, 'patch', '/usuarios/:id/status', 'admin'],
    [relatorioRoutes, 'get', '/', 'admin'],
    [relatorioRoutes, 'get', '/export', 'admin'],
];

describe('controle de acesso nas rotas sensiveis', () => {
    test.each(rotasComPapel)(
        '%s %s exige autenticacao e papel %s',
        (router, metodo, caminho, papelPermitido) => {
            const handlers = obterHandlers(router, metodo, caminho);
            expect(handlers[0]).toBe(verificarToken);

            const permitido = executarMiddleware(handlers[1], papelPermitido);
            expect(permitido.next).toHaveBeenCalledTimes(1);

            const papelNegado = papelPermitido === 'cidadao'
                ? 'profissional'
                : papelPermitido === 'profissional'
                    ? 'cidadao'
                    : 'profissional';
            const negado = executarMiddleware(handlers[1], papelNegado);
            expect(negado.next).not.toHaveBeenCalled();
            expect(negado.res.status).toHaveBeenCalledWith(403);
        }
    );

    test('denuncia exige token, mas a participacao e validada no model para ambos os papeis', () => {
        const handlers = obterHandlers(solicitacaoRoutes, 'post', '/:id/denuncia');
        expect(handlers[0]).toBe(verificarToken);
        // O endpoint atende cidadao e profissional; o INSERT so ocorre quando um deles e parte do chamado.
        expect(handlers).toHaveLength(4);
    });
});
