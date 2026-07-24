const verificarToken = require('../../src/middlewares/authMiddleware');
const adminCategoriaRoutes = require('../../src/routes/adminCategoriaRoutes');
const categoriaRoutes = require('../../src/routes/categoriaRoutes');
const favoritoRoutes = require('../../src/routes/favoritoRoutes');
const notificationRoutes = require('../../src/routes/notificationRoutes');
const servicoRoutes = require('../../src/routes/servicoRoutes');
const solicitacaoRoutes = require('../../src/routes/solicitacaoRoutes');
const profissionalRoutes = require('../../src/routes/profissionalRoutes');
const agendaRoutes = require('../../src/routes/agendaRoutes');
const avaliacaoRoutes = require('../../src/routes/avaliacaoRoutes');

function obterHandlers(router, metodo, caminho) {
    const camada = router.stack.find((item) => (
        item.route?.path === caminho && item.route.methods[metodo]
    ));
    if (!camada) {
        throw new Error(`Rota ${metodo.toUpperCase()} ${caminho} nao encontrada.`);
    }
    return camada.route.stack.map((item) => item.handle);
}

function respostaMock() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const rotasPublicas = [
    [profissionalRoutes, 'get', '/:id'],
    [agendaRoutes, 'get', '/profissionais/:id'],
    [avaliacaoRoutes, 'get', '/profissional/:id'],
];

const rotasProtegidasSemRole = [
    [favoritoRoutes, 'post', '/:profissionalId'],
    [favoritoRoutes, 'delete', '/:profissionalId'],
    [notificationRoutes, 'patch', '/:id/lida'],
    [solicitacaoRoutes, 'get', '/:id'],
    [solicitacaoRoutes, 'post', '/:id/denuncia'],
    [solicitacaoRoutes, 'get', '/:id/mensagens'],
    [solicitacaoRoutes, 'post', '/:id/mensagens'],
];

const rotasProtegidasComRole = [
    [adminCategoriaRoutes, 'put', '/categorias/:id'],
    [adminCategoriaRoutes, 'delete', '/categorias/:id'],
    [adminCategoriaRoutes, 'get', '/verificacoes/:id/documento'],
    [adminCategoriaRoutes, 'patch', '/verificacoes/:id/aprovar'],
    [adminCategoriaRoutes, 'patch', '/verificacoes/:id/rejeitar'],
    [adminCategoriaRoutes, 'get', '/denuncias/:id'],
    [adminCategoriaRoutes, 'patch', '/denuncias/:id'],
    [adminCategoriaRoutes, 'patch', '/usuarios/:id/status'],
    [categoriaRoutes, 'put', '/admin/:id'],
    [categoriaRoutes, 'delete', '/admin/:id'],
    [servicoRoutes, 'put', '/:id/status'],
    [solicitacaoRoutes, 'post', '/:id/fotos-conclusao'],
    [solicitacaoRoutes, 'patch', '/:id/status'],
    [solicitacaoRoutes, 'patch', '/:id/proposta-valor'],
    [solicitacaoRoutes, 'patch', '/:id/proposta-valor/aceitar'],
    [solicitacaoRoutes, 'patch', '/:id/proposta-valor/recusar'],
    [solicitacaoRoutes, 'patch', '/:id/cancelar'],
    [solicitacaoRoutes, 'patch', '/:id/remarcar'],
    [solicitacaoRoutes, 'patch', '/:id/remarcacao/aceitar'],
    [solicitacaoRoutes, 'patch', '/:id/remarcacao/recusar'],
];

function confirmarRejeicaoDoId(middleware, campo) {
    const req = { params: { [campo]: 'nao-numerico' } };
    const res = respostaMock();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        erro: 'O ID deve ser um numero inteiro positivo.',
    });
}

describe('validacao Zod dos parametros numericos', () => {
    test.each(rotasPublicas)(
        'rota publica %s %s rejeita ID invalido antes do controller',
        (router, metodo, caminho) => {
            const handlers = obterHandlers(router, metodo, caminho);
            confirmarRejeicaoDoId(handlers[0], 'id');
        }
    );

    test.each(rotasProtegidasSemRole)(
        'rota protegida %s %s autentica antes de validar o ID',
        (router, metodo, caminho) => {
            const handlers = obterHandlers(router, metodo, caminho);
            expect(handlers[0]).toBe(verificarToken);
            confirmarRejeicaoDoId(
                handlers[1],
                caminho.includes(':profissionalId') ? 'profissionalId' : 'id'
            );
        }
    );

    test.each(rotasProtegidasComRole)(
        'rota com papel %s %s autentica/autoriza antes de validar o ID',
        (router, metodo, caminho) => {
            const handlers = obterHandlers(router, metodo, caminho);
            expect(handlers[0]).toBe(verificarToken);
            confirmarRejeicaoDoId(handlers[2], 'id');
        }
    );

    test('converte ID decimal textual valido antes de seguir', () => {
        const handlers = obterHandlers(profissionalRoutes, 'get', '/:id');
        const req = { params: { id: '42' } };
        const res = respostaMock();
        const next = jest.fn();

        handlers[0](req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.params).toEqual({ id: 42 });
        expect(req.validated.params).toEqual({ id: 42 });
    });
});
