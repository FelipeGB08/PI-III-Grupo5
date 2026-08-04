const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const nomeBanco = `conecta_audit_${Date.now()}`;

function config(database) {
    if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);
        url.pathname = `/${database}`;
        return { connectionString: url.toString() };
    }
    return {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database,
    };
}

function identificador(nome) {
    if (!/^conecta_audit_\d+$/.test(nome)) {
        throw new Error('Nome de banco descartavel recusado.');
    }
    return `"${nome}"`;
}

async function verificar() {
    const bancoAdmin = process.env.DB_NAME || (
        process.env.DATABASE_URL
            ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
            : 'postgres'
    );
    const admin = new Client(config(bancoAdmin));
    let criado = false;

    try {
        await admin.connect();
        await admin.query(`CREATE DATABASE ${identificador(nomeBanco)}`);
        criado = true;

        const teste = new Client(config(nomeBanco));
        await teste.connect();
        try {
            const migrationsPath = path.join(__dirname, '..', 'migrations');
            const arquivos = fs.readdirSync(migrationsPath)
                .filter((arquivo) => arquivo.endsWith('.sql'))
                .sort();
            for (const arquivo of arquivos) {
                await teste.query('BEGIN');
                try {
                    await teste.query(
                        fs.readFileSync(path.join(migrationsPath, arquivo), 'utf8')
                    );
                    await teste.query('COMMIT');
                } catch (error) {
                    await teste.query('ROLLBACK');
                    error.message = `${arquivo}: ${error.message}`;
                    throw error;
                }
            }
            const tabelas = await teste.query(
                `SELECT COUNT(*)::int AS total
                 FROM information_schema.tables
                 WHERE table_schema = 'public'`
            );
            console.log(
                `${arquivos.length} migrations validadas em banco descartavel ` +
                `com ${tabelas.rows[0].total} tabelas.`
            );
        } finally {
            await teste.end();
        }
    } finally {
        if (criado) {
            await admin.query(
                `DROP DATABASE IF EXISTS ${identificador(nomeBanco)} WITH (FORCE)`
            );
            console.log('Banco descartavel removido com sucesso.');
        }
        await admin.end();
    }
}

verificar().catch((error) => {
    console.error('Falha ao validar migrations:', error.message);
    process.exit(1);
});
