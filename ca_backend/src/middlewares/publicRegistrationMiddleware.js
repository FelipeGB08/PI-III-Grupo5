const { authRateLimit, cadastroRateLimit } = require('./rateLimitMiddleware');
const validate = require('./validateMiddleware');
const { cadastroSchema, loginSchema } = require('../validators/authSchemas');

// Reutilizado por todos os aliases publicos para que nenhum cadastro fique
// sem validacao ou limitacao de tentativas.
const cadastroPublicoMiddlewares = [
    cadastroRateLimit,
    validate(cadastroSchema),
];

// Os aliases de login compartilham a mesma instancia do limitador e do schema.
// Isso evita que uma rota legada seja usada para contornar a protecao da outra.
const loginPublicoMiddlewares = [
    authRateLimit,
    validate(loginSchema),
];

module.exports = {
    cadastroPublicoMiddlewares,
    loginPublicoMiddlewares,
};
