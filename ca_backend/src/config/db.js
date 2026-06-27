const { Pool } = require('pg');
require('dotenv').config(); // Isso aqui puxa as senhas do seu arquivo .env

// Cria a configuração de conexão usando as variáveis de ambiente
// Aceita DB_PASS (usado no .env do projeto) ou DB_PASSWORD
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD || process.env.DB_PASS,
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
        }
);

// Testa a conexão na hora que o servidor liga
pool.connect((err, client, release) => {
    if (err) {
        console.error(' Erro ao conectar ao PostgreSQL:', err.stack);
    } else {
        console.log(' Conexão com o banco de dados deu certo ');
        release(); // Libera o cliente de volta para o pool
    }
});

module.exports = pool;