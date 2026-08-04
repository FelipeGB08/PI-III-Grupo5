const crypto = require('crypto');
const pool = require('../config/db');

function hashKey(chave) {
    return crypto.createHash('sha256').update(String(chave)).digest('hex');
}

function criarPostgresRateLimitStore() {
    return {
        consumir: async ({ chave, windowMs }) => {
            const result = await pool.query(
                `WITH limpeza AS (
                    DELETE FROM rate_limit_buckets
                    WHERE reset_em < NOW() - INTERVAL '1 hour'
                 )
                 INSERT INTO rate_limit_buckets (chave_hash, contador, reset_em)
                 VALUES (
                    $1,
                    1,
                    NOW() + make_interval(secs => $2::double precision)
                 )
                 ON CONFLICT (chave_hash) DO UPDATE
                 SET contador = CASE
                        WHEN rate_limit_buckets.reset_em <= NOW() THEN 1
                        ELSE rate_limit_buckets.contador + 1
                     END,
                     reset_em = CASE
                        WHEN rate_limit_buckets.reset_em <= NOW()
                            THEN NOW() + make_interval(secs => $2::double precision)
                        ELSE rate_limit_buckets.reset_em
                     END
                 RETURNING contador, reset_em`,
                [hashKey(chave), windowMs / 1000]
            );
            const row = result.rows[0];
            return {
                count: Number(row.contador),
                resetAt: new Date(row.reset_em).getTime(),
            };
        },
        estornar: async ({ chave }) => {
            await pool.query(
                `UPDATE rate_limit_buckets
                 SET contador = GREATEST(contador - 1, 0)
                 WHERE chave_hash = $1
                   AND reset_em > NOW()`,
                [hashKey(chave)]
            );
        },
        resetar: async () => {
            if (process.env.NODE_ENV === 'test') {
                await pool.query('DELETE FROM rate_limit_buckets');
            }
        },
    };
}

module.exports = {
    criarPostgresRateLimitStore,
    hashKey,
};
