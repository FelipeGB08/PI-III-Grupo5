const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_ORIGIN = API_BASE_URL
  .replace(/\/$/, '')
  .replace(/\/api(?:\/v1)?$/, '');

const runId = Date.now();
const senha = 'Teste123456';
const cidade = 'Concordia';

const cidadaoEmail = `cidadao.e2e.${runId}@amauc.com`;
const intrusoEmail = `intruso.e2e.${runId}@amauc.com`;
const profissionalEmail = `profissional.e2e.${runId}@amauc.com`;

function proximoDiaUtilComHorario(horario = '10:00') {
  const agora = new Date();
  const alvo = new Date(agora);
  alvo.setDate(alvo.getDate() + 1);

  while (alvo.getDay() === 0 || alvo.getDay() === 6) {
    alvo.setDate(alvo.getDate() + 1);
  }

  const [hora, minuto] = horario.split(':').map(Number);
  alvo.setHours(hora, minuto, 0, 0);
  return alvo;
}

function diaSemanaAmaUc(data) {
  const dia = data.getDay();
  return dia === 0 ? 7 : dia;
}

function timestampLocal(data) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}:00`;
}

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
  const expectedStatus = options.expectedStatus;

  if (expectedStatus && response.status === expectedStatus) {
    return data;
  }

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text}`);
  }

  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`${options.method || 'GET'} ${path} -> esperado ${expectedStatus}, recebido ${response.status}`);
  }

  return data;
}

async function validarPrefixosApi() {
  const respostas = await Promise.all([
    fetch(`${API_ORIGIN}/api/v1/status`),
    fetch(`${API_ORIGIN}/api/status`),
  ]);

  for (const resposta of respostas) {
    if (!resposta.ok) {
      throw new Error(`Status da API versionada/legada retornou ${resposta.status}.`);
    }
    const corpo = await resposta.json();
    if (!corpo?.mensagem) {
      throw new Error('Status da API nao retornou a mensagem esperada.');
    }
  }
}

async function uploadFotoConclusao({ solicitacaoId, token }) {
  const formData = new FormData();
  formData.append(
    'fotos',
    new Blob(['foto-e2e'], { type: 'image/jpeg' }),
    'evidencia-e2e.jpg'
  );

  const response = await fetch(`${API_BASE_URL}/solicitacoes/${solicitacaoId}/fotos-conclusao`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`POST /solicitacoes/${solicitacaoId}/fotos-conclusao -> ${response.status}: ${text}`);
  }

  return data;
}

async function registrarUsuario({ nome, email, perfil_tipo }) {
  const isProfissional = perfil_tipo === 'profissional';
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      email,
      senha,
      telefone: '(49) 99999-0000',
      cidade_amauc: cidade,
      perfil_tipo,
      ...(isProfissional ? {
        biografia: 'Profissional E2E com atendimento regional AMAUC.',
        categoria: 'TI',
        cidades_atendidas: [cidade],
      } : {}),
    }),
  });

  return data.usuario;
}

async function login(email) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  const accessToken = data.access_token || data.token;
  if (!accessToken || !data.refresh_token) {
    throw new Error('Login nao retornou access token e refresh token.');
  }
  return {
    accessToken,
    refreshToken: data.refresh_token,
  };
}

async function renovarSessao(refreshToken, expectedStatus) {
  const data = await request('/auth/refresh', {
    method: 'POST',
    expectedStatus,
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (expectedStatus) return data;
  if (!data.token || !data.usuario?.id) {
    throw new Error('Refresh de sessao nao retornou token e usuario.');
  }
  return data.token;
}

async function logout(refreshToken) {
  await request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

async function esperarNotificacao({ token, tipo, timeoutMs = 3000 }) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const data = await request('/notificacoes', { token });
    const encontrada = data.notificacoes?.find((item) => item.tipo === tipo);
    if (encontrada) return encontrada;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Notificacao ${tipo} nao encontrada.`);
}

async function main() {
  console.log('[E2E] Validando prefixos v1 e legado...');
  await validarPrefixosApi();

  console.log('[E2E] Criando usuários...');

  await registrarUsuario({
    nome: 'Cidadao E2E',
    email: cidadaoEmail,
    perfil_tipo: 'cidadao',
  });

  await registrarUsuario({
    nome: 'Intruso E2E',
    email: intrusoEmail,
    perfil_tipo: 'cidadao',
  });

  const profissional = await registrarUsuario({
    nome: 'Profissional E2E',
    email: profissionalEmail,
    perfil_tipo: 'profissional',
  });

  console.log('[E2E] Login...');
  const cidadaoSession = await login(cidadaoEmail);
  const intrusoSession = await login(intrusoEmail);
  const profissionalSession = await login(profissionalEmail);
  const cidadaoToken = await renovarSessao(cidadaoSession.refreshToken);
  const intrusoToken = intrusoSession.accessToken;
  const profissionalToken = profissionalSession.accessToken;

  console.log('[E2E] Atualizando Curriculo Vivo com portfolio...');
  await request('/perfil', {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({
      biografia: 'Profissional E2E com atendimento regional AMAUC e portfolio ativo.',
      anos_experiencia: 7,
      curriculo_texto: 'Atua com servicos residenciais, atendimento rural e manutencao preventiva.',
      portfolio_url: 'https://example.com/portfolio-e2e',
      portfolio_fotos: [
        'https://example.com/trabalho-1.jpg',
        'https://example.com/trabalho-2.jpg',
      ],
      certificacoes: ['https://example.com/certificado-e2e.jpg'],
      cidades_atendidas: [cidade],
      atende_rural: true,
      atende_emergencia: true,
      possui_veiculo: true,
    }),
  });

  const perfilPublico = await request(`/profissionais/${profissional.id}`);
  if (
    !perfilPublico.portfolio_fotos?.length ||
    !perfilPublico.certificacoes?.length
  ) {
    throw new Error('Perfil publico nao retornou portfolio/certificacoes.');
  }

  const dataAgendada = proximoDiaUtilComHorario('10:00');
  const agendadoPara = timestampLocal(dataAgendada);
  const diaSemana = diaSemanaAmaUc(dataAgendada);

  console.log('[E2E] Configurando agenda do profissional...');
  const agendaResponse = await request('/agenda/me', {
    method: 'PUT',
    token: profissionalToken,
    body: JSON.stringify({
      servicos: [
        {
          nome: 'Corte de cabelo',
          duracao_minutos: 60,
          preco: 50,
        },
      ],
      horarios: [
        { dia_semana: diaSemana, horario: '10:00' },
        { dia_semana: diaSemana, horario: '14:00' },
      ],
    }),
  });

  const agendaServico = agendaResponse.agenda?.servicos?.[0];
  if (!agendaServico?.id) {
    throw new Error('Serviço da agenda não foi criado.');
  }

  console.log('[E2E] Cliente agenda serviço...');
  const solicitacaoResponse = await request('/solicitacoes', {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      profissional_id: profissional.id,
      agenda_servico_id: agendaServico.id,
      servico_nome: 'Nome adulterado pelo app',
      preco: 9999,
      descricao: 'Fluxo E2E: serviço agendado',
      endereco_atendimento: 'Rua das Flores, 123',
      agendado_para: agendadoPara,
    }),
  });

  const solicitacao = solicitacaoResponse.solicitacao;
  if (!solicitacao?.id) {
    throw new Error('Solicitação não foi criada.');
  }

  if (Number(solicitacao.preco) !== 50 || solicitacao.servico_nome !== 'Corte de cabelo') {
    throw new Error('Backend confiou em preço/nome enviados pelo app.');
  }

  console.log('[E2E] Validando central de notificacoes...');
  const notificacaoNovoChamado = await esperarNotificacao({
    token: profissionalToken,
    tipo: 'novo_chamado',
  });
  await request(`/notificacoes/${notificacaoNovoChamado.id}/lida`, {
    method: 'PATCH',
    token: profissionalToken,
  });
  const notificacoesAtualizadas = await request('/notificacoes', {
    token: profissionalToken,
  });
  const notificacaoLida = notificacoesAtualizadas.notificacoes?.find(
    (item) => item.id === notificacaoNovoChamado.id
  );
  if (!notificacaoLida?.lida_em) {
    throw new Error('Notificacao nao foi marcada como lida.');
  }

  console.log('[E2E] Cliente cancela solicitacao com politica registrada...');
  const dataParaCancelar = proximoDiaUtilComHorario('14:00');
  const solicitacaoCancelamentoResponse = await request('/solicitacoes', {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      profissional_id: profissional.id,
      agenda_servico_id: agendaServico.id,
      descricao: 'Fluxo E2E: servico para cancelamento',
      endereco_atendimento: 'Rua das Flores, 123',
      agendado_para: timestampLocal(dataParaCancelar),
    }),
  });

  const cancelamentoResponse = await request(
    `/solicitacoes/${solicitacaoCancelamentoResponse.solicitacao.id}/cancelar`,
    {
      method: 'PATCH',
      token: cidadaoToken,
      body: JSON.stringify({ motivo: 'Teste de politica de cancelamento' }),
    }
  );
  if (
    cancelamentoResponse.solicitacao?.status !== 'cancelado_cliente' ||
    !cancelamentoResponse.solicitacao?.politica_cancelamento ||
    !cancelamentoResponse.solicitacao?.reembolso_status
  ) {
    throw new Error('Cancelamento nao registrou politica e reembolso.');
  }

  console.log('[E2E] Validando chat do chamado...');
  await request(`/solicitacoes/${solicitacao.id}/mensagens`, {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({ mensagem: 'Ola, podemos confirmar os detalhes?' }),
  });
  const historicoChat = await request(`/solicitacoes/${solicitacao.id}/mensagens`, {
    token: profissionalToken,
  });
  if (!historicoChat.mensagens?.some((item) => item.mensagem.includes('confirmar'))) {
    throw new Error('Historico do chat nao retornou a mensagem enviada.');
  }

  const conversaProfissional = await esperarNotificacao({
    token: profissionalToken,
    tipo: 'nova_mensagem_chat',
  });
  if (!conversaProfissional?.id) {
    throw new Error('Notificacao de nova mensagem nao foi registrada.');
  }

  const conversasCliente = await request('/solicitacoes/conversas', {
    token: cidadaoToken,
  });
  const conversasPrestador = await request('/solicitacoes/conversas', {
    token: profissionalToken,
  });
  if (
    !conversasCliente.conversas?.some((item) => item.servico_id === solicitacao.id) ||
    !conversasPrestador.conversas?.some((item) => item.servico_id === solicitacao.id)
  ) {
    throw new Error('Lista de conversas nao retornou o chamado para cliente e prestador.');
  }

  await request(`/solicitacoes/${solicitacao.id}/mensagens`, {
    method: 'POST',
    token: intrusoToken,
    expectedStatus: 404,
    body: JSON.stringify({ mensagem: 'Tentativa sem permissao' }),
  });

  console.log('[E2E] Validando busca por raio no mapa...');
  const profissionaisNoRaio = await request('/profissionais?lat=-27.2342&lng=-52.0277&raio_km=80&limit=10', {
    token: cidadaoToken,
  });
  if (!profissionaisNoRaio.some((item) => item.id === profissional.id && item.distancia_km !== null)) {
    throw new Error('Busca por raio nao retornou distancia do profissional.');
  }

  console.log('[E2E] Validando bloqueio de avaliacao antes da conclusao...');
  await request('/avaliacoes', {
    method: 'POST',
    token: cidadaoToken,
    expectedStatus: 403,
    body: JSON.stringify({
      servico_id: solicitacao.id,
      nota_estrelas: 5,
      comentario: 'Tentativa antes da conclusao',
    }),
  });

  console.log('[E2E] Prestador visualiza chamado recebido...');
  const minhasSolicitacoes = await request(
    '/solicitacoes/minhas-solicitacoes?status=pendente&page=1&pageSize=1',
    {
      token: profissionalToken,
    },
  );
  const listaPrestador = minhasSolicitacoes.solicitacoes || minhasSolicitacoes.pedidos || [];
  if (!listaPrestador.some((item) => item.id === solicitacao.id)) {
    throw new Error('Prestador nao recebeu a solicitacao criada pelo cliente.');
  }
  if (
    listaPrestador.length !== 1 ||
    minhasSolicitacoes.page !== 1 ||
    minhasSolicitacoes.pageSize !== 1 ||
    typeof minhasSolicitacoes.total !== 'number'
  ) {
    throw new Error('Paginacao de solicitacoes nao foi respeitada pela API.');
  }

  console.log('[E2E] Validando bloqueio de horario indisponivel...');
  const dataIndisponivel = new Date(dataAgendada);
  dataIndisponivel.setHours(15, 30, 0, 0);
  await request('/solicitacoes', {
    method: 'POST',
    token: cidadaoToken,
    expectedStatus: 400,
    body: JSON.stringify({
      profissional_id: profissional.id,
      agenda_servico_id: agendaServico.id,
      descricao: 'Tentativa fora da agenda',
      endereco_atendimento: 'Rua das Flores, 123',
      agendado_para: timestampLocal(dataIndisponivel),
    }),
  });

  console.log('[E2E] Validando bloqueio de conflito de horário...');
  await request('/solicitacoes', {
    method: 'POST',
    token: cidadaoToken,
    expectedStatus: 409,
    body: JSON.stringify({
      profissional_id: profissional.id,
      agenda_servico_id: agendaServico.id,
      descricao: 'Tentativa duplicada',
      endereco_atendimento: 'Rua das Flores, 123',
      agendado_para: agendadoPara,
    }),
  });

  console.log('[E2E] Validando bloqueio de permissao no status...');
  await request(`/solicitacoes/${solicitacao.id}/status`, {
    method: 'PATCH',
    token: cidadaoToken,
    expectedStatus: 404,
    body: JSON.stringify({ status: 'aceito' }),
  });

  console.log('[E2E] Prestador aceita...');
  await request(`/solicitacoes/${solicitacao.id}/status`, {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({ status: 'aceito' }),
  });

  console.log('[E2E] Prestador anexa evidencia do servico...');
  const uploadConclusao = await uploadFotoConclusao({
    solicitacaoId: solicitacao.id,
    token: profissionalToken,
  });
  if (!uploadConclusao.solicitacao?.fotos_conclusao?.length) {
    throw new Error('Upload de evidencia nao retornou fotos_conclusao.');
  }

  console.log('[E2E] Prestador propoe remarcacao...');
  const novaData = new Date(dataAgendada);
  novaData.setHours(14, 0, 0, 0);
  const remarcacaoResponse = await request(`/solicitacoes/${solicitacao.id}/remarcar`, {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({
      nova_data_hora: timestampLocal(novaData),
      motivo: 'Fluxo E2E: ajuste de horario',
    }),
  });

  if (remarcacaoResponse.solicitacao?.status !== 'remarcacao_solicitada') {
    throw new Error('Remarcacao nao ficou pendente para aceite do cliente.');
  }

  console.log('[E2E] Cliente aceita remarcacao...');
  const aceiteRemarcacao = await request(`/solicitacoes/${solicitacao.id}/remarcacao/aceitar`, {
    method: 'PATCH',
    token: cidadaoToken,
  });

  const horaAplicada = new Date(aceiteRemarcacao.solicitacao?.agendado_para).getHours();
  if (aceiteRemarcacao.solicitacao?.status !== 'aceito' || horaAplicada !== 14) {
    throw new Error('Cliente aceitou remarcacao, mas horario novo nao foi aplicado.');
  }

  console.log('[E2E] Prestador conclui...');
  await request(`/solicitacoes/${solicitacao.id}/status`, {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({ status: 'concluido' }),
  });

  console.log('[E2E] Cliente avalia...');
  await request('/avaliacoes', {
    method: 'POST',
    token: cidadaoToken,
    body: JSON.stringify({
      servico_id: solicitacao.id,
      nota_estrelas: 5,
      comentario: 'Fluxo E2E de agenda OK',
    }),
  });

  await esperarNotificacao({
    token: profissionalToken,
    tipo: 'avaliacao_recebida',
  });

  console.log('[E2E] Validando bloqueio de avaliacao duplicada...');
  await request('/avaliacoes', {
    method: 'POST',
    token: cidadaoToken,
    expectedStatus: 400,
    body: JSON.stringify({
      servico_id: solicitacao.id,
      nota_estrelas: 4,
      comentario: 'Tentativa duplicada',
    }),
  });

  console.log('[E2E] Validando historico financeiro...');
  const financeiroCliente = await request('/solicitacoes/financeiro', {
    token: cidadaoToken,
  });
  const financeiroPrestador = await request('/solicitacoes/financeiro', {
    token: profissionalToken,
  });

  if (
    Number(financeiroCliente.resumo?.total_concluido) !== 50 ||
    Number(financeiroPrestador.resumo?.total_concluido) !== 50
  ) {
    throw new Error('Financeiro nao somou o servico concluido corretamente.');
  }

  if (
    Number(financeiroCliente.resumo?.total_cancelado) !== 50 ||
    !financeiroCliente.itens?.some((item) => item.status === 'cancelado_cliente')
  ) {
    throw new Error('Financeiro nao registrou cancelamento com valor.');
  }

  console.log('[E2E] Revogando refresh token no logout...');
  await logout(cidadaoSession.refreshToken);
  await renovarSessao(cidadaoSession.refreshToken, 401);

  console.log('[E2E] Anonimizando a conta do cliente...');
  const sessaoParaExcluir = await login(cidadaoEmail);
  const exclusao = await request('/perfil/conta', {
    method: 'DELETE',
    token: sessaoParaExcluir.accessToken,
    body: JSON.stringify({ confirmacao: 'EXCLUIR MINHA CONTA' }),
  });

  if (!Number.isInteger(exclusao.refresh_tokens_revogados) || exclusao.refresh_tokens_revogados < 1) {
    throw new Error('Exclusao de conta nao revogou os refresh tokens do usuario.');
  }

  await renovarSessao(sessaoParaExcluir.refreshToken, 401);
  await request('/auth/login', {
    method: 'POST',
    expectedStatus: 401,
    body: JSON.stringify({ email: cidadaoEmail, senha }),
  });

  console.log('[E2E] Confirmando que o historico do prestador foi preservado...');
  const historicoAposExclusao = await request(
    '/solicitacoes/minhas-solicitacoes?status=concluido&page=1&pageSize=20',
    { token: profissionalToken }
  );
  const solicitacaoPreservada = (historicoAposExclusao.solicitacoes || []).find(
    (item) => Number(item.id) === Number(solicitacao.id)
  );
  if (!solicitacaoPreservada || solicitacaoPreservada.cidadao_nome !== 'Usuário removido') {
    throw new Error('Historico do prestador nao foi preservado com o cliente anonimizado.');
  }

  console.log('[E2E] Teste finalizado com sucesso!');
}

main().catch((error) => {
  console.error('[E2E] Falhou:', error.message);
  process.exit(1);
});
