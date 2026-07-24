const {
    authRateLimit,
    cadastroRateLimit,
    solicitacaoRateLimit,
    chatRateLimit,
    uploadRateLimit,
} = require('../middlewares/rateLimitMiddleware');

const API_PREFIX_V1 = '/api/v1';
const API_PREFIX_LEGADO = '/api';
const metodosHttp = ['get', 'post', 'put', 'patch', 'delete'];
const rateLimiters = new Set([
    authRateLimit,
    cadastroRateLimit,
    solicitacaoRateLimit,
    chatRateLimit,
    uploadRateLimit,
]);

const rotasApi = [
    ['/auth', require('../routes/authRoutes')],
    ['/usuarios', require('../routes/userRoutes')],
    ['/perfil', require('../routes/perfilRoutes')],
    ['/servicos', require('../routes/servicoRoutes')],
    ['/solicitacoes', require('../routes/solicitacaoRoutes')],
    ['/avaliacoes', require('../routes/avaliacaoRoutes')],
    ['/categorias', require('../routes/categoriaRoutes')],
    ['/admin', require('../routes/adminCategoriaRoutes')],
    ['/upload', require('../routes/uploadRoutes')],
    ['/admin/relatorios', require('../routes/relatorioRoutes')],
    ['/profissionais', require('../routes/profissionalRoutes')],
    ['/agenda', require('../routes/agendaRoutes')],
    ['/dispositivos', require('../routes/dispositivoRoutes')],
    ['/notificacoes', require('../routes/notificationRoutes')],
    ['/favoritos', require('../routes/favoritoRoutes')],
];

function registrarRotasApi(app, prefixo) {
    for (const [caminho, router] of rotasApi) {
        app.use(`${prefixo}${caminho}`, router);
    }
}

function normalizarCaminhoExpress(caminho) {
    return String(caminho || '/')
        .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function montarCaminho(base, caminho) {
    const relativo = normalizarCaminhoExpress(caminho);
    return relativo === '/' ? base : `${base}${relativo}`;
}

function listarOperacoesDeclaradas() {
    const operacoes = [{
        path: '/status',
        method: 'get',
        rateLimited: false,
    }];

    for (const [base, router] of rotasApi) {
        for (const layer of router.stack || []) {
            if (!layer.route) continue;

            const caminhos = Array.isArray(layer.route.path)
                ? layer.route.path
                : [layer.route.path];
            const rateLimited = (layer.route.stack || [])
                .some((handler) => rateLimiters.has(handler.handle));

            for (const caminho of caminhos) {
                for (const method of metodosHttp) {
                    if (!layer.route.methods[method]) continue;
                    operacoes.push({
                        path: montarCaminho(base, caminho),
                        method,
                        rateLimited,
                    });
                }
            }
        }
    }

    return operacoes;
}

module.exports = {
    API_PREFIX_V1,
    API_PREFIX_LEGADO,
    rotasApi,
    registrarRotasApi,
    listarOperacoesDeclaradas,
};
