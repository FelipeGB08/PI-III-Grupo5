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

const CLIENTES = [
  { nome: 'Ana Contratante', email: 'ana.contratante@amauc.com', cidade: 'Concórdia', telefone: '(49) 98801-0001' },
  { nome: 'Pedro Contratante', email: 'pedro.contratante@amauc.com', cidade: 'Seara', telefone: '(49) 98802-0002' },
  { nome: 'Lúcia Contratante', email: 'lucia.contratante@amauc.com', cidade: 'Irani', telefone: '(49) 98803-0003' },
];

const ADMIN = {
  nome: 'Admin AMAUC',
  email: 'admin@amauc.com',
  cidade: 'ConcÃ³rdia',
  telefone: '(49) 98800-0000',
};

const PRESTADORES = [
  {
    nome: 'João Hidráulica',
    email: 'joao.hidraulica@amauc.com',
    cidade: 'Concórdia',
    categoria: 'Hidráulica',
    biografia: 'Encanador com 12 anos de experiência na região AMAUC.',
    telefone: '(49) 99901-0001',
    anos: 12,
  },
  {
    nome: 'Maria Elétrica',
    email: 'maria.eletrica@amauc.com',
    cidade: 'Seara',
    categoria: 'Elétrica',
    biografia: 'Eletricista certificada NR-10, residencial e comercial.',
    telefone: '(49) 99902-0002',
    anos: 8,
  },
  {
    nome: 'Carlos Construção',
    email: 'carlos.construcao@amauc.com',
    cidade: 'Itá',
    categoria: 'Construção',
    biografia: 'Pedreiro e mestre de obras para reformas e construções.',
    telefone: '(49) 99903-0003',
    anos: 15,
  },
  {
    nome: 'Fernanda Limpeza',
    email: 'fernanda.limpeza@amauc.com',
    cidade: 'Irani',
    categoria: 'Limpeza',
    biografia: 'Limpeza residencial, pós-obra e comercial.',
    telefone: '(49) 99904-0004',
    anos: 6,
  },
  {
    nome: 'Ricardo TI',
    email: 'ricardo.ti@amauc.com',
    cidade: 'Piratuba',
    categoria: 'TI',
    biografia: 'Suporte técnico, redes e manutenção de computadores.',
    telefone: '(49) 99905-0005',
    anos: 10,
  },
];

async function limparDadosSimulacao() {
  await pool.query(`
    DELETE FROM avaliacoes;
    DELETE FROM servicos_solicitados;
    DELETE FROM profissional_agenda_horarios;
    DELETE FROM profissional_agenda_servicos;
    DELETE FROM profissional_categorias;
    DELETE FROM perfis_profissionais;
    DELETE FROM usuarios WHERE email LIKE '%@amauc.com';
  `);
}

async function criarUsuario({ nome, email, perfilTipo, cidade, telefone }) {
  const hash = await bcrypt.hash(SENHA, 10);
  const result = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, telefone, cidade_amauc, perfil_tipo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [nome, email, hash, telefone, cidade, perfilTipo]
  );
  return result.rows[0].id;
}

async function criarPrestadorCompleto(p, mapaCategorias) {
  const userId = await criarUsuario({
    nome: p.nome,
    email: p.email,
    perfilTipo: 'profissional',
    cidade: p.cidade,
    telefone: p.telefone,
  });

  await pool.query(
    `INSERT INTO perfis_profissionais (
       usuario_id,
       biografia,
       anos_experiencia,
       curriculo_texto,
       portfolio_url,
       verificado
     )
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [
      userId,
      p.biografia,
      p.anos,
      `Atua em ${p.categoria} na regiao AMAUC. Atendimento com foco em qualidade, prazo e comunicacao clara.`,
      `https://portfolio.example.com/${p.email.split('@')[0]}`,
    ]
  );

  const catId = mapaCategorias[p.categoria];
  if (catId) {
    await pool.query(
      `INSERT INTO profissional_categorias (profissional_id, categoria_id) VALUES ($1, $2)`,
      [userId, catId]
    );
  }

  await configurarAgendaPrestador(userId, p.categoria);

  return userId;
}

function servicosPorCategoria(categoria) {
  const mapa = {
    'HidrÃ¡ulica': [
      ['Troca de Chuveiro', 60, 120],
      ['Instalacao de Torneira', 90, 110],
      ['Visita Tecnica', 40, 80],
    ],
    'ElÃ©trica': [
      ['Instalacao de Tomadas', 120, 90],
      ['Troca de Disjuntor', 60, 130],
      ['Visita Tecnica', 40, 80],
    ],
    'Limpeza': [
      ['Limpeza Residencial', 180, 150],
      ['Limpeza Pos-Obra', 240, 280],
      ['Visita Tecnica', 40, 60],
    ],
    'TI': [
      ['Formatacao de Computador', 120, 140],
      ['Configuracao de Wi-Fi', 90, 120],
      ['Visita Tecnica', 40, 80],
    ],
  };
  return mapa[categoria] || [
    ['Visita Tecnica', 40, 80],
    ['Servico Residencial', 120, 180],
    ['Orcamento no Local', 30, 60],
  ];
}

async function configurarAgendaPrestador(profissionalId, categoria) {
  const servicos = servicosPorCategoria(categoria);
  for (const [ordem, servico] of servicos.entries()) {
    await pool.query(
      `INSERT INTO profissional_agenda_servicos
       (profissional_id, nome, duracao_minutos, preco, ativo, ordem)
       VALUES ($1, $2, $3, $4, TRUE, $5)`,
      [profissionalId, servico[0], servico[1], servico[2], ordem]
    );
  }

  const horarios = ['09:00', '10:30', '14:00', '15:30'];
  for (const dia of [1, 2, 3, 4, 5]) {
    for (const horario of horarios) {
      await pool.query(
        `INSERT INTO profissional_agenda_horarios (profissional_id, dia_semana, horario, ativo)
         VALUES ($1, $2, $3, TRUE)`,
        [profissionalId, dia, horario]
      );
    }
  }
}

async function seed() {
  console.log('Limpando dados de simulação anteriores...');
  await limparDadosSimulacao();

  const cats = await pool.query('SELECT id, nome_servico FROM categorias');
  const mapaCategorias = Object.fromEntries(cats.rows.map((c) => [c.nome_servico, c.id]));

  console.log('Criando clientes...');
  const clienteIds = {};
  for (const c of CLIENTES) {
    clienteIds[c.email] = await criarUsuario({ ...c, perfilTipo: 'cidadao' });
  }

  console.log('Criando administrador...');
  await criarUsuario({ ...ADMIN, perfilTipo: 'admin' });

  console.log('Criando prestadores...');
  const prestadorIds = {};
  for (const p of PRESTADORES) {
    prestadorIds[p.email] = await criarPrestadorCompleto(p, mapaCategorias);
  }

  console.log('Criando serviços de simulação...');
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
      status: 'aceito',
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
      `INSERT INTO servicos_solicitados (cidadao_id, prof_id, descricao, status, preco)
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
      `INSERT INTO avaliacoes (servico_id, nota_estrelas, comentario)
       VALUES ($1, 5, $2)`,
      [
        concluidoId,
        'Excelente trabalho, telhado impecável! Recomendo na região AMAUC.',
      ]
    );
  }

  console.log('\n✅ Simulação criada! Senha de todas as contas: sim123456\n');
  console.log('── CLIENTES ──');
  CLIENTES.forEach((c) => console.log(`  ${c.email}`));
  console.log('\nADMIN');
  console.log(`  ${ADMIN.email}`);
  console.log('\n── PRESTADORES ──');
  PRESTADORES.forEach((p) => console.log(`  ${p.email}  (${p.categoria} — ${p.cidade})`));
  console.log('\n── SERVIÇOS ──');
  console.log('  1 pendente  → Ana → João (hidráulica)');
  console.log('  1 aceito → Pedro → Maria (elétrica)');
  console.log('  1 concluido + avaliação → Lúcia → Carlos (construção)');
  console.log('  2 pendentes extras → Ana/Pedro\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
