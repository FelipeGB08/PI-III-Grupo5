const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

const runId = Date.now();
const senha = 'Teste123456';
const cidade = 'Concordia';
const cidadaoEmail = `cidadao.e2e.${runId}@amauc.com`;
const profissionalEmail = `profissional.e2e.${runId}@amauc.com`;

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
  console.log('[E2E] Registrando cidadao e profissional...');
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

  console.log('[E2E] Fazendo login e validando JWT...');
  const cidadaoToken = await login(cidadaoEmail);
  const profissionalToken = await login(profissionalEmail);

  console.log('[E2E] Criando Curriculo Vivo do profissional...');
  await request('/perfil', {
    method: 'POST',
    token: profissionalToken,
    body: JSON.stringify({
      biografia: 'Profissional de TI para manutencao e redes na regiao AMAUC.',
      anos_experiencia: 7,
      curriculo_texto: 'Suporte tecnico, redes Wi-Fi e manutencao preventiva.',
      portfolio_url: 'https://portfolio.example.com/profissional-e2e',
      categoria: 'TI',
    }),
  });

  console.log('[E2E] Buscando profissional...');
  const profissionais = await request('/profissionais?cidade=Conc%C3%B3rdia&categoria=TI');
  const profissional = profissionais.find((p) => p.email === profissionalEmail);
  if (!profissional) {
    throw new Error('Profissional criado nao apareceu na busca por cidade/categoria.');
  }

  console.log('[E2E] Solicitando orcamento...');
  const solicitacaoData = await request('/solicitacoes', {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      profissional_id: profissional.id,
      descricao: 'Teste E2E: configurar rede Wi-Fi residencial.',
    }),
  });
  const solicitacao = solicitacaoData.solicitacao || solicitacaoData.servico;

  console.log('[E2E] Aceitando e concluindo servico...');
  await request(`/solicitacoes/${solicitacao.id}/status`, {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({ status: 'aceito' }),
  });
  await request(`/solicitacoes/${solicitacao.id}/status`, {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({ status: 'concluido' }),
  });

  console.log('[E2E] Avaliando servico concluido...');
  await request('/avaliacoes', {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      servico_id: solicitacao.id,
      nota_estrelas: 5,
      comentario: 'Fluxo E2E concluido com sucesso.',
    }),
  });

  const resumo = await request(`/avaliacoes/profissional/${profissional.id}`);
  if (!resumo.avaliacoes?.length) {
    throw new Error('Avaliacao nao apareceu no resumo do profissional.');
  }

  console.log('[E2E] Fluxo completo aprovado.');
}

main().catch((error) => {
  console.error('[E2E] Falhou:', error.message);
  process.exit(1);
});
