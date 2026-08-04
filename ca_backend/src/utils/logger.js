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

const CHAVES_SENSIVEIS = /password|senha|token|authorization|secret|credential|cookie|latitude|longitude|endereco/i;

function sanitizar(valor, chave = '', profundidade = 0) {
    if (CHAVES_SENSIVEIS.test(chave)) return '[REDACTED]';
    if (profundidade > 5) return '[TRUNCATED]';
    if (Array.isArray(valor)) {
        return valor.map((item) => sanitizar(item, chave, profundidade + 1));
    }
    if (valor && typeof valor === 'object' && !(valor instanceof Error)) {
        return Object.fromEntries(
            Object.entries(valor).map(([nome, item]) => [
                nome,
                sanitizar(item, nome, profundidade + 1),
            ])
        );
    }
    return valor;
}

function registrar(nivel, mensagem, contexto = {}) {
    const { erro, ...dados } = contexto;
    const evento = {
        timestamp: new Date().toISOString(),
        nivel,
        mensagem,
        ...sanitizar(dados),
        ...(erro ? { erro: normalizarErro(erro) } : {}),
    };

    const metodoConsole = nivel === 'error'
        ? console.error
        : (nivel === 'warn' ? console.warn : console.info);
    metodoConsole(JSON.stringify(evento));

    if (!sentryAtivo || nivel !== 'error') return;

    Sentry.withScope((scope) => {
        scope.setLevel('error');
        scope.setContext('log', sanitizar(dados));

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
