const { spawnSync } = require('child_process');

function executarScript(nome) {
  const resultado = spawnSync('npm', ['run', nome], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) {
    throw new Error(`${nome} terminou com codigo ${resultado.status}.`);
  }
}

async function inicializar() {
  executarScript('db:migrate');

  const pool = require('../src/config/db');
  const resultado = await pool.query(
    'SELECT EXISTS (SELECT 1 FROM usuarios LIMIT 1) AS possui_usuarios'
  );
  const possuiUsuarios = resultado.rows[0]?.possui_usuarios === true;
  await pool.end();

  if (possuiUsuarios) {
    console.log('Banco ja possui usuarios; seed inicial ignorado.');
    return;
  }

  console.log('Banco vazio; aplicando seed inicial...');
  executarScript('db:seed');
}

inicializar().catch((erro) => {
  console.error('Falha ao inicializar banco no Docker:', erro.message);
  process.exit(1);
});
