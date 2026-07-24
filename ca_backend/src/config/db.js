const { Pool } = require('pg');
require('dotenv').config();

const CONNECTION_TIMEOUT_MS = 5000;

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
        }
        : {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
        }
);

if (process.env.NODE_ENV !== 'test') {
    pool.connect((err, client, release) => {
        if (err) {
            console.error('Erro ao conectar ao PostgreSQL:', err.message);
        } else {
            console.log('Conexao com o banco de dados deu certo.');
            release();
        }
    });
}

module.exports = pool;
