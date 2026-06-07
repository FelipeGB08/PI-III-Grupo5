/**
 * Popula o banco com contas de simulação AMAUC.
 * Senha de todas as contas: sim123456
 *
 * Uso: npm run db:seed
 */
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/db');

const SENHA = 'sim123456';

const CIDADES_COORDS = {
  'Concórdia': { lat: -27.2342, lng: -52.0277 },
  'Xanxerê': { lat: -26.8744, lng: -52.4036 },
  'São Miguel do Oeste': { lat: -26.7244, lng: -53.5169 },
  'Maravilha': { lat: -26.7678, lng: -53.1772 },
  'Palmitos': { lat: -27.1667, lng: -53.1611 },
};

const CLIENTES = [
  { nome: 'Ana Contratante', email: 'ana.contratante@amauc.com', cidade: 'Concórdia' },
  { nome: 'Pedro Contratante', email: 'pedro.contratante@amauc.com', cidade: 'Xanxerê' },
  { nome: 'Lúcia Contratante', email: 'lucia.contratante@amauc.com', cidade: 'Maravilha' },
];

const PRESTADORES = [
  {
    nome: 'João Hidráulica',
    email: 'joao.hidraulica@amauc.com',
    cidade: 'Concórdia',
    categoria: 'Hidráulica',
    bio: 'Encanador com 12 anos de experiência na região AMAUC.',
    telefone: '(49) 99901-0001',
    anos: 12,
  },
  {
    nome: 'Maria Elétrica',
    email: 'maria.eletrica@amauc.com',
    cidade: 'Xanxerê',
    categoria: 'Elétrica',
    bio: 'Eletricista certificada NR-10, residencial e comercial.',
    telefone: '(49) 99902-0002',
    anos: 8,
  },
  {
    nome: 'Carlos Construção',
    email: 'carlos.construcao@amauc.com',
    cidade: 'São Miguel do Oeste',
    categoria: 'Construção',
    bio: 'Pedreiro e mestre de obras para reformas e construções.',
    telefone: '(49) 99903-0003',
    anos: 15,
  },
  {
    nome: 'Fernanda Limpeza',
    email: 'fernanda.limpeza@amauc.com',
    cidade: 'Maravilha',
    categoria: 'Limpeza',
    bio: 'Limpeza residencial, pós-obra e comercial.',
    telefone: '(49) 99904-0004',
    anos: 6,
  },
  {
    nome: 'Ricardo TI',
    email: 'ricardo.ti@amauc.com',
    cidade: 'Palmitos',
    categoria: 'TI',
    bio: 'Suporte técnico, redes e manutenção de computadores.',
    telefone: '(49) 99905-0005',
    anos: 10,
  },
];

async function limparDadosSimulacao() {
  await pool.query(`
    DELETE FROM avaliacoes;
    DELETE FROM solicitacoes_orcamento;
    DELETE FROM profissional_categorias;
    DELETE FROM curriculos;
    DELETE FROM perfil_profissional;
    DELETE FROM usuarios WHERE email LIKE '%@amauc.com';
  `);
}

async function criarUsuario({ nome, email, tipo, cidade }) {
  const coords = CIDADES_COORDS[cidade] || CIDADES_COORDS['Concórdia'];
  const hash = await bcrypt.hash(SENHA, 10);
  const result = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario, cidade, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [nome, email, hash, tipo, cidade, coords.lat, coords.lng]
  );
  return result.rows[0].id;
}

async function criarPrestadorCompleto(p, mapaCategorias) {
  const userId = await criarUsuario({
    nome: p.nome,
    email: p.email,
    tipo: 'profissional',
    cidade: p.cidade,
  });

  await pool.query(
    `INSERT INTO perfil_profissional (usuario_id, bio, telefone_comercial, cidade, categoria)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, p.bio, p.telefone, p.cidade, p.categoria]
  );

  await pool.query(
    `INSERT INTO curriculos (profissional_id, biografia, anos_experiencia)
     VALUES ($1, $2, $3)`,
    [userId, p.bio, p.anos]
  );

  const catId = mapaCategorias[p.categoria];
  if (catId) {
    await pool.query(
      `INSERT INTO profissional_categorias (profissional_id, categoria_id) VALUES ($1, $2)`,
      [userId, catId]
    );
  }

  return userId;
}

async function seed() {
  console.log('Limpando dados de simulação anteriores...');
  await limparDadosSimulacao();

  const cats = await pool.query('SELECT id, nome FROM categorias');
  const mapaCategorias = Object.fromEntries(cats.rows.map((c) => [c.nome, c.id]));

  console.log('Criando clientes...');
  const clienteIds = {};
  for (const c of CLIENTES) {
    clienteIds[c.email] = await criarUsuario({ ...c, tipo: 'cidadao' });
  }

  console.log('Criando prestadores...');
  const prestadorIds = {};
  for (const p of PRESTADORES) {
    prestadorIds[p.email] = await criarPrestadorCompleto(p, mapaCategorias);
  }

  console.log('Criando chamados de simulação...');
  const chamados = [
    {
      cidadao: 'ana.contratante@amauc.com',
      profissional: 'joao.hidraulica@amauc.com',
      descricao: 'Vazamento no banheiro — troca de registro',
      status: 'pendente',
    },
    {
      cidadao: 'pedro.contratante@amauc.com',
      profissional: 'maria.eletrica@amauc.com',
      descricao: 'Troca de disjuntores no quadro elétrico',
      status: 'em_andamento',
      preco: 280.0,
    },
    {
      cidadao: 'lucia.contratante@amauc.com',
      profissional: 'carlos.construcao@amauc.com',
      descricao: 'Reforma parcial do telhado',
      status: 'concluido',
      preco: 1500.0,
    },
    {
      cidadao: 'ana.contratante@amauc.com',
      profissional: 'maria.eletrica@amauc.com',
      descricao: 'Instalação de chuveiro elétrico na suíte',
      status: 'pendente',
    },
    {
      cidadao: 'pedro.contratante@amauc.com',
      profissional: 'ricardo.ti@amauc.com',
      descricao: 'Configuração de rede Wi-Fi no comércio',
      status: 'pendente',
    },
  ];

  let concluidoId = null;
  for (const ch of chamados) {
    const res = await pool.query(
      `INSERT INTO solicitacoes_orcamento (cidadao_id, profissional_id, descricao, status, preco)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        clienteIds[ch.cidadao],
        prestadorIds[ch.profissional],
        ch.descricao,
        ch.status,
        ch.preco ?? null,
      ]
    );
    if (ch.status === 'concluido') concluidoId = res.rows[0].id;
  }

  if (concluidoId) {
    await pool.query(
      `INSERT INTO avaliacoes (solicitacao_id, cidadao_id, profissional_id, nota, comentario)
       VALUES ($1, $2, $3, 5, $4)`,
      [
        concluidoId,
        clienteIds['lucia.contratante@amauc.com'],
        prestadorIds['carlos.construcao@amauc.com'],
        'Excelente trabalho, telhado impecável! Recomendo na região AMAUC.',
      ]
    );
  }

  console.log('\n✅ Simulação criada! Senha de todas as contas: sim123456\n');
  console.log('── CLIENTES ──');
  CLIENTES.forEach((c) => console.log(`  ${c.email}`));
  console.log('\n── PRESTADORES ──');
  PRESTADORES.forEach((p) => console.log(`  ${p.email}  (${p.categoria} — ${p.cidade})`));
  console.log('\n── CHAMADOS ──');
  console.log('  1 pendente  → Ana → João (hidráulica)');
  console.log('  1 em_andamento → Pedro → Maria (elétrica)');
  console.log('  1 concluido + avaliação → Lúcia → Carlos (construção)');
  console.log('  2 pendentes extras → Ana/Pedro\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
