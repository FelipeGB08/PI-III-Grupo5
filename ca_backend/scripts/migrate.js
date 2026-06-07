const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/db');

async function migrate() {
  const sqlPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Aplicando schema em', process.env.DB_NAME || 'conecta_amauc', '...');
  await pool.query(sql);
  console.log('Schema aplicado com sucesso!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Falha na migração:', err.message);
  process.exit(1);
});
