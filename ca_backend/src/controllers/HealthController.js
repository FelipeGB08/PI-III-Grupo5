const logger = require('../utils/logger');

const HEALTHCHECK_TIMEOUT_MS = 5000;

async function consultarBancoComTimeout(pool, timeoutMs) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const erro = new Error('Tempo limite do healthcheck PostgreSQL excedido.');
            erro.code = 'HEALTHCHECK_TIMEOUT';
            reject(erro);
        }, timeoutMs);
    });

    try {
        await Promise.race([
            pool.query('SELECT 1 AS healthcheck'),
            timeout,
        ]);
    } finally {
        clearTimeout(timeoutId);
    }
}

function criarHealthController(
    pool,
    { timeoutMs = HEALTHCHECK_TIMEOUT_MS } = {}
) {
    if (!pool || typeof pool.query !== 'function') {
        throw new TypeError('HealthController requer um pool PostgreSQL com método query.');
    }

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new TypeError('O timeout do healthcheck deve ser um numero positivo.');
    }

    return async function responderStatus(req, res) {
        try {
            await consultarBancoComTimeout(pool, timeoutMs);
            return res.status(200).json({
                mensagem: 'API do Conecta Amauc rodando!',
                banco: 'disponivel',
            });
        } catch (erro) {
            logger.error('Healthcheck falhou ao consultar o PostgreSQL.', {
                erro,
                rota: req.path,
            });
            return res.status(503).json({
                erro: 'Banco de dados indisponivel.',
            });
        }
    };
}

module.exports = {
    HEALTHCHECK_TIMEOUT_MS,
    criarHealthController,
};
