const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

const runId = Date.now();
const senha = 'Teste123456';
const cidade = 'Concordia';

const cidadaoEmail = `cidadao.e2e.${runId}@amauc.com`;
const profissionalEmail = `profissional.e2e.${runId}@amauc.com`;

let agendamentoId;
let servicoId;
let profissionalId;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text}`);
  }

  return data;
}

async function registrarUsuario({ nome, email, perfil_tipo }) {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      email,
      senha,
      telefone: '(49) 99999-0000',
      cidade_amauc: cidade,
      perfil_tipo,
    }),
  });
}

async function login(email) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  return data.token;
}

async function main() {
  console.log('[E2E] Criando usuários...');

  await registrarUsuario({
    nome: 'Cidadao E2E',
    email: cidadaoEmail,
    perfil_tipo: 'cidadao',
  });

  await registrarUsuario({
    nome: 'Profissional E2E',
    email: profissionalEmail,
    perfil_tipo: 'profissional',
  });

  console.log('[E2E] Login...');
  const cidadaoToken = await login(cidadaoEmail);
  const profissionalToken = await login(profissionalEmail);

  console.log('[E2E] Criando agenda do profissional...');

  const agenda = await request('/agenda/minha', {
    method: 'POST',
    token: profissionalToken,
    body: JSON.stringify({
      servicos: [
        {
          nome: 'Corte de cabelo',
          duracao_minutos: 60,
          preco: 50,
        },
      ],
      horarios: ['10:00']
    }),
  });

  servicoId = agenda.agenda?.servicos?.[0]?.id || 1;
  profissionalId = agenda.agenda?.profissional_id || null;

  console.log('[E2E] Buscando profissional...');

  const profissionais = await request(
    `/profissionais?cidade=${encodeURIComponent('Concordia')}&categoria=TI`
  );

  const profissional = profissionais.find((p) => p.email === profissionalEmail);

  if (!profissional) {
    throw new Error('Profissional nao encontrado na busca.');
  }

  console.log('[E2E] Criando agendamento...');

  const agendamento = await request('/agendamentos', {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      agenda_servico_id: servicoId,
      data_hora: '2099-06-24T10:00:00',
    }),
  });

  agendamentoId = agendamento.id;

  console.log('[E2E] Aceitando agendamento...');

  await request(`/agendamentos/${agendamentoId}/aceitar`, {
    method: 'PUT',
    token: profissionalToken,
  });

  console.log('[E2E] Concluindo agendamento...');

  await request(`/agendamentos/${agendamentoId}/concluir`, {
    method: 'PUT',
    token: profissionalToken,
  });

  console.log('[E2E] Avaliando...');

  await request(`/agendamentos/${agendamentoId}/avaliar`, {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      nota: 5,
      comentario: 'Fluxo E2E de agendamento OK',
    }),
  });

  console.log('[E2E] Teste finalizado com sucesso!');
}

main().catch((error) => {
  console.error('[E2E] Falhou:', error.message);
  process.exit(1);
});