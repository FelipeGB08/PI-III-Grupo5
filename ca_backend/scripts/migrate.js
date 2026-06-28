const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/db');

async function migrate() {
  const migrationsPath = path.join(__dirname, '..', 'migrations');
  const arquivos = fs
    .readdirSync(migrationsPath)
    .filter((arquivo) => arquivo.endsWith('.sql'))
    .sort();

  if (arquivos.length === 0) {
    console.log('Nenhuma migration encontrada.');
    await pool.end();
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const aplicadasResult = await pool.query('SELECT filename FROM schema_migrations');
  const aplicadas = new Set(aplicadasResult.rows.map((row) => row.filename));

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) {
      console.log(`Ignorando ${arquivo} (ja aplicada).`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsPath, arquivo), 'utf8');
    console.log(`Aplicando ${arquivo}...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [arquivo]
      );
      await client.query('COMMIT');
      console.log(`${arquivo} aplicada com sucesso.`);
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log('Migrations incrementais aplicadas com sucesso!');
}

migrate().catch((err) => {
  console.error('Falha na migracao:', err.message);
  process.exit(1);
});
