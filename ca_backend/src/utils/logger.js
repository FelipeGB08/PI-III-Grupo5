const { Sentry, sentryAtivo } = require('../config/sentry');

function normalizarErro(erro) {
    if (!erro) return null;

    return {
        nome: erro.name || 'Error',
        mensagem: erro.message || String(erro),
        stack: erro.stack || undefined,
        codigo: erro.code || undefined,
    };
}

function registrar(nivel, mensagem, contexto = {}) {
    const { erro, ...dados } = contexto;
    const evento = {
        timestamp: new Date().toISOString(),
        nivel,
        mensagem,
        ...dados,
        ...(erro ? { erro: normalizarErro(erro) } : {}),
    };

    const metodoConsole = nivel === 'error'
        ? console.error
        : (nivel === 'warn' ? console.warn : console.info);
    metodoConsole(JSON.stringify(evento));

    if (!sentryAtivo || nivel !== 'error') return;

    Sentry.withScope((scope) => {
        scope.setLevel('error');
        scope.setContext('log', dados);

        if (dados.usuarioId !== undefined && dados.usuarioId !== null) {
            scope.setUser({ id: String(dados.usuarioId) });
        }

        if (erro instanceof Error) {
            Sentry.captureException(erro);
            return;
        }

        Sentry.captureMessage(mensagem, 'error');
    });
}

module.exports = {
    info: (mensagem, contexto) => registrar('info', mensagem, contexto),
    warn: (mensagem, contexto) => registrar('warn', mensagem, contexto),
    error: (mensagem, contexto) => registrar('error', mensagem, contexto),
};
