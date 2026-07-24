const JWT_SECRET_MIN_LENGTH = 32;

function texto(valor) {
    return String(valor || '').trim();
}

function segredoJwtInseguro(segredo) {
    const valor = texto(segredo);
    if (valor.length < JWT_SECRET_MIN_LENGTH) return true;

    const placeholder = /^(troque|substitua|seu|sua|change|example|placeholder|default|jwt[_-]?secret|secret|senha|password)([_\s-]|$)/i;
    if (placeholder.test(valor)) return true;

    return /^(.)\1+$/.test(valor);
}

function urlPostgresValida(valor) {
    try {
        const url = new URL(texto(valor));
        const protocoloValido =
            url.protocol === 'postgres:' || url.protocol === 'postgresql:';
        const banco = decodeURIComponent(url.pathname || '')
            .replace(/^\/+/, '')
            .trim();
        return protocoloValido && Boolean(url.hostname) && Boolean(banco);
    } catch {
        return false;
    }
}

function origensValidas(valor) {
    const origens = texto(valor)
        .split(',')
        .map((origem) => origem.trim())
        .filter(Boolean);

    if (origens.length === 0 || origens.includes('*')) return false;

    return origens.every((origem) => {
        try {
            const url = new URL(origem);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    });
}

function errosDaConfiguracaoDeProducao(env = process.env) {
    if (env.NODE_ENV !== 'production') return [];

    const erros = [];
    if (segredoJwtInseguro(env.JWT_SECRET)) {
        erros.push(
            `JWT_SECRET deve ter pelo menos ${JWT_SECRET_MIN_LENGTH} caracteres, não pode ser placeholder e não pode ser repetitivo.`
        );
    }

    const databaseUrl = texto(env.DATABASE_URL);
    if (databaseUrl) {
        if (!urlPostgresValida(databaseUrl)) {
            erros.push('DATABASE_URL deve ser uma URL PostgreSQL válida (postgres:// ou postgresql://).');
        }
    } else {
        const faltantes = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(
            (nome) => !texto(env[nome])
        );
        if (faltantes.length > 0) {
            erros.push(
                `Informe DATABASE_URL ou todas as variáveis de banco: ${faltantes.join(', ')}.`
            );
        }
    }

    if (!origensValidas(env.ALLOWED_ORIGINS)) {
        erros.push('ALLOWED_ORIGINS deve conter uma ou mais URLs http(s) separadas por vírgula; "*" não é permitido em produção.');
    }

    return erros;
}

function validarConfiguracaoDeProducao(env = process.env) {
    const erros = errosDaConfiguracaoDeProducao(env);
    if (erros.length === 0) return;

    throw new Error(`Configuração de produção inválida: ${erros.join(' ')}`);
}

module.exports = {
    JWT_SECRET_MIN_LENGTH,
    errosDaConfiguracaoDeProducao,
    validarConfiguracaoDeProducao,
};
