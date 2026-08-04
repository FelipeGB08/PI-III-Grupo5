const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { io: criarClienteSocket } = require('socket.io-client');
const {
  criarContextoLimpeza,
  limparResiduosAnterioresE2E,
  limparResiduosE2E,
  registrarUpload,
  registrarUsuario: registrarUsuarioParaLimpeza,
} = require('./e2eCleanup');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_ORIGIN = API_BASE_URL
  .replace(/\/$/, '')
  .replace(/\/api(?:\/v1)?$/, '');

const runId = Date.now();
const senha = 'Teste123456';
const cidade = 'Concordia';
const FUSO_AMAUC = 'America/Sao_Paulo';

const cidadaoEmail = `cidadao.e2e.${runId}@amauc.com`;
const intrusoEmail = `intruso.e2e.${runId}@amauc.com`;
const profissionalEmail = `profissional.e2e.${runId}@amauc.com`;
const contextoLimpeza = criarContextoLimpeza({ apiBaseUrl: API_BASE_URL });
const SOCKET_TIMEOUT_MS = Number(process.env.E2E_SOCKET_TIMEOUT_MS || 5000);
const socketsE2E = new Set();

function criarSocketE2E(accessToken) {
  const socket = criarClienteSocket(API_ORIGIN, {
    auth: { token: accessToken },
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    timeout: SOCKET_TIMEOUT_MS,
    transports: ['websocket'],
  });
  socketsE2E.add(socket);
  return socket;
}

function fecharSocketE2E(socket) {
  if (!socket) return;
  socket.removeAllListeners();
  socket.close();
  socketsE2E.delete(socket);
}

function fecharTodosSocketsE2E() {
  for (const socket of socketsE2E) {
    fecharSocketE2E(socket);
  }
}

async function conectarSocketAtivo(accessToken, descricao) {
  const socket = criarSocketE2E(accessToken);

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        limpar();
        reject(new Error(`Socket ${descricao} nao conectou dentro do prazo.`));
      }, SOCKET_TIMEOUT_MS);

      const limpar = () => {
        clearTimeout(timer);
        socket.off('connect', conectado);
        socket.off('connect_error', falhou);
      };
      const conectado = () => {
        limpar();
        resolve();
      };
      const falhou = (erro) => {
        limpar();
        reject(new Error(
          `Socket ${descricao} recusou token ativo: ${erro?.message || 'erro desconhecido'}.`
        ));
      };

      socket.once('connect', conectado);
      socket.once('connect_error', falhou);
      socket.connect();
    });
    return socket;
  } catch (erro) {
    fecharSocketE2E(socket);
    throw erro;
  }
}

function prepararEsperaRevogacaoSocket(socket, descricao) {
  let concluir;
  let falhar;
  let finalizada = false;
  let revogacao;
  let motivoDesconexao;

  const promise = new Promise((resolve, reject) => {
    concluir = resolve;
    falhar = reject;
  });

  const limpar = () => {
    clearTimeout(timer);
    socket.off('auth:revoked', aoRevogar);
    socket.off('disconnect', aoDesconectar);
  };
  const finalizarSeCompleta = () => {
    if (revogacao === undefined || motivoDesconexao === undefined) return;
    finalizada = true;
    limpar();
    concluir({ revogacao, motivoDesconexao });
  };
  const aoRevogar = (payload) => {
    revogacao = payload;
    finalizarSeCompleta();
  };
  const aoDesconectar = (motivo) => {
    motivoDesconexao = motivo;
    finalizarSeCompleta();
  };
  const timer = setTimeout(() => {
    if (finalizada) return;
    finalizada = true;
    limpar();
    falhar(new Error(
      `Servidor nao revogou/desconectou o socket ${descricao} dentro do prazo.`
    ));
  }, SOCKET_TIMEOUT_MS);

  socket.once('auth:revoked', aoRevogar);
  socket.once('disconnect', aoDesconectar);

  return {
    promise,
    cancelar: () => {
      if (finalizada) return;
      finalizada = true;
      limpar();
      concluir({ cancelada: true });
    },
  };
}

async function enviarMensagemSocketAtivo(socket, servicoId, mensagem) {
  const resposta = await new Promise((resolve, reject) => {
    socket.timeout(SOCKET_TIMEOUT_MS).emit(
      'chat:send',
      { servico_id: servicoId, mensagem },
      (erro, payload) => {
        if (erro) {
          reject(new Error(`Socket ativo nao confirmou mensagem: ${erro.message}.`));
          return;
        }
        resolve(payload);
      }
    );
  });

  if (!resposta?.mensagem?.id || resposta.mensagem.mensagem !== mensagem) {
    throw new Error('Socket ativo nao persistiu a mensagem de controle.');
  }
}

async function confirmarEnvioRecusado(socket, servicoId, mensagem) {
  if (socket.connected) {
    throw new Error('Socket continuou conectado depois da revogacao.');
  }

  await new Promise((resolve, reject) => {
    socket.timeout(Math.min(SOCKET_TIMEOUT_MS, 1500)).emit(
      'chat:send',
      { servico_id: servicoId, mensagem },
      (erro, payload) => {
        if (erro || Number(payload?.status) === 401) {
          resolve();
          return;
        }
        reject(new Error(
          'Envio Socket.IO foi aceito ou respondeu sem erro de sessao depois da revogacao.'
        ));
      }
    );
  });
}

async function confirmarReconexaoRecusada(accessToken, descricao) {
  const socket = criarSocketE2E(accessToken);
  try {
    const erroConexao = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        limpar();
        reject(new Error(
          `Reconexao do socket ${descricao} nao foi recusada dentro do prazo.`
        ));
      }, SOCKET_TIMEOUT_MS);
      const limpar = () => {
        clearTimeout(timer);
        socket.off('connect', conectado);
        socket.off('connect_error', recusado);
      };
      const conectado = () => {
        limpar();
        reject(new Error(
          `Servidor aceitou reconexao do socket ${descricao} com sessao revogada.`
        ));
      };
      const recusado = (erro) => {
        limpar();
        resolve(erro);
      };

      socket.once('connect', conectado);
      socket.once('connect_error', recusado);
      socket.connect();
    });

    if (!/sessao|conta|token|inativ/i.test(String(erroConexao?.message || ''))) {
      throw new Error(
        `Reconexao ${descricao} falhou sem erro claro de autenticacao: `
        + `${erroConexao?.message || 'erro desconhecido'}.`
      );
    }
  } finally {
    fecharSocketE2E(socket);
  }
}

async function confirmarMensagemAusente({ solicitacaoId, tokenLeitor, mensagem }) {
  const historico = await request(
    `/solicitacoes/${solicitacaoId}/mensagens?limit=100`,
    { token: tokenLeitor }
  );
  if (historico.mensagens?.some((item) => item.mensagem === mensagem)) {
    throw new Error('Mensagem enviada depois da revogacao foi persistida.');
  }
}

async function validarRevogacaoSocket({
  accessToken,
  descricao,
  executarRevogacao,
  solicitacaoId,
  tokenLeitor,
}) {
  const socket = await conectarSocketAtivo(accessToken, descricao);
  const mensagemAtiva = `E2E socket ativo ${descricao} ${runId}`;
  const mensagemRevogada = `E2E socket revogado ${descricao} ${runId}`;

  try {
    await enviarMensagemSocketAtivo(socket, solicitacaoId, mensagemAtiva);
    const esperaRevogacao = prepararEsperaRevogacaoSocket(socket, descricao);

    let resultado;
    try {
      resultado = await executarRevogacao();
    } catch (erro) {
      esperaRevogacao.cancelar();
      throw erro;
    }

    const desconexao = await esperaRevogacao.promise;
    if (
      !desconexao.revogacao?.erro ||
      desconexao.motivoDesconexao !== 'io server disconnect'
    ) {
      throw new Error(
        `Socket ${descricao} foi encerrado sem notificacao de revogacao valida.`
      );
    }

    await confirmarEnvioRecusado(socket, solicitacaoId, mensagemRevogada);
    await confirmarReconexaoRecusada(accessToken, descricao);
    await confirmarMensagemAusente({
      solicitacaoId,
      tokenLeitor,
      mensagem: mensagemRevogada,
    });
    return resultado;
  } finally {
    fecharSocketE2E(socket);
  }
}

function partesDataAmaUc(data) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_AMAUC,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return {
    ano: Number(valor('year')),
    mes: Number(valor('month')),
    dia: Number(valor('day')),
    hora: Number(valor('hour')),
    minuto: Number(valor('minute')),
  };
}

function proximoDiaUtilComHorario(horario = '10:00', agora = new Date()) {
  const partes = partesDataAmaUc(agora);
  const alvo = new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia));
  alvo.setUTCDate(alvo.getUTCDate() + 1);

  while (alvo.getUTCDay() === 0 || alvo.getUTCDay() === 6) {
    alvo.setUTCDate(alvo.getUTCDate() + 1);
  }

  const [hora, minuto] = horario.split(':').map(Number);
  alvo.setUTCHours(hora, minuto, 0, 0);
  return alvo;
}

function diaSemanaAmaUc(data) {
  const dia = data.getUTCDay();
  return dia === 0 ? 7 : dia;
}

function timestampLocal(data) {
  const pad = (valor) => String(valor).padStart(2, '0');
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}`
    + `T${pad(data.getUTCHours())}:${pad(data.getUTCMinutes())}:00-03:00`;
}

function horaAmaUc(data) {
  return partesDataAmaUc(data).hora;
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

async function validarEntradasInvalidas() {
  const cadastroAdmin = {
    nome: 'Administrador indevido',
    senha,
    telefone: '(49) 99999-0000',
    cidade_amauc: cidade,
    perfil_tipo: 'admin',
  };
  const tentativasCadastro = [
    {
      url: `${API_ORIGIN}/api/v1/auth/registro`,
      email: `admin.auth.e2e.${runId}@amauc.com`,
    },
    {
      url: `${API_ORIGIN}/api/usuarios/registro`,
      email: `admin.usuarios.e2e.${runId}@amauc.com`,
    },
  ];

  for (const tentativa of tentativasCadastro) {
    const response = await fetch(tentativa.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cadastroAdmin,
        email: tentativa.email,
      }),
    });
    if (response.status !== 400 && response.status !== 403) {
      throw new Error(
        `Cadastro publico de admin retornou ${response.status}, esperado 400/403.`
      );
    }
  }

  const jsonInvalido = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email":',
  });
  if (jsonInvalido.status !== 400) {
    throw new Error(
      `JSON malformado retornou ${jsonInvalido.status}, esperado 400.`
    );
  }
  const corpoJsonInvalido = await jsonInvalido.json();
  if (!corpoJsonInvalido?.erro) {
    throw new Error('JSON malformado nao retornou o formato { erro }.');
  }

  await request('/profissionais/invalido', { expectedStatus: 400 });
  await request('/agenda/profissionais/invalido', { expectedStatus: 400 });
  await request('/avaliacoes/profissional/invalido', { expectedStatus: 400 });
}

async function uploadFotoConclusao({ solicitacaoId, token }) {
  const formData = new FormData();
  const imagemPngValida = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
    0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 240,
    31, 0, 5, 0, 1, 255, 114, 156, 82, 103, 0, 0, 0, 0, 73, 69,
    78, 68, 174, 66, 96, 130,
  ]);
  formData.append(
    'fotos',
    new Blob([imagemPngValida], { type: 'image/png' }),
    'evidencia-e2e.png'
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

  registrarUpload(contextoLimpeza, data?.solicitacao?.fotos_conclusao);
  return data;
}

async function validarAcessoUpload({ url, token, expectedStatus }) {
  const response = await fetch(`${API_ORIGIN}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(
      `GET ${url} -> ${response.status}, esperado ${expectedStatus}: ${body}`
    );
  }
  return response;
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

  if (!data.usuario?.id) {
    throw new Error('Cadastro E2E nao retornou o identificador do usuario.');
  }
  registrarUsuarioParaLimpeza(contextoLimpeza, data.usuario, email);
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

async function executarFluxoE2E() {
  console.log('[E2E] Validando prefixos v1 e legado...');
  await validarPrefixosApi();
  console.log('[E2E] Validando cadastro administrativo e payloads invalidos...');
  await validarEntradasInvalidas();

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
  const perfilAtualizadoResponse = await request('/perfil', {
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

  if (
    !perfilAtualizadoResponse.perfil?.portfolio_fotos?.length ||
    !perfilAtualizadoResponse.perfil?.certificacoes?.length
  ) {
    throw new Error('Perfil profissional nao preservou portfolio/certificacoes.' );
  }

  const perfilPublico = await request(`/profissionais/${profissional.id}`);
  const camposPublicosPermitidos = new Set([
    'id',
    'nome',
    'foto_url',
  'cidade_amauc',
  'biografia',
  'categorias',
  'verificado',
  'media_avaliacao',
    'distancia_km',
    'latitude',
    'longitude',
    'localizacao_aproximada',
  ]);
  const campoPublicoIndevido = Object.keys(perfilPublico).find(
    (campo) => !camposPublicosPermitidos.has(campo)
  );
  if (campoPublicoIndevido) {
    throw new Error(
      `Perfil publico expos campo nao permitido: ${campoPublicoIndevido}.`
    );
  }

  if (typeof perfilPublico.verificado !== 'boolean') {
    throw new Error(
      'Perfil publico nao retornou selo de verificacao em formato booleano.'
    );
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
      atendimento_latitude: -27.2342,
      atendimento_longitude: -52.0277,
      agendado_para: agendadoPara,
    }),
  });

  const solicitacao = solicitacaoResponse.solicitacao;
  if (!solicitacao?.id) {
    throw new Error('Solicitação não foi criada.');
  }
  if (
    Number(solicitacao.atendimento_latitude) !== -27.2342 ||
    Number(solicitacao.atendimento_longitude) !== -52.0277
  ) {
    throw new Error('Solicitação não preservou a localização privada do atendimento.');
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
  dataIndisponivel.setUTCHours(15, 30, 0, 0);
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
    expectedStatus: 403,
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
  const urlEvidencia = uploadConclusao.solicitacao.fotos_conclusao[0];
  await validarAcessoUpload({
    url: urlEvidencia,
    expectedStatus: 401,
  });
  await validarAcessoUpload({
    url: urlEvidencia,
    token: intrusoToken,
    expectedStatus: 403,
  });
  const downloadEvidencia = await validarAcessoUpload({
    url: urlEvidencia,
    token: cidadaoToken,
    expectedStatus: 200,
  });
  if (downloadEvidencia.headers.get('cache-control') !== 'private, no-store') {
    throw new Error('Download privado da evidencia nao retornou Cache-Control seguro.');
  }

  console.log('[E2E] Prestador propoe remarcacao...');
  const novaData = new Date(dataAgendada);
  novaData.setUTCHours(14, 0, 0, 0);
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

  const horaAplicada = horaAmaUc(
    new Date(aceiteRemarcacao.solicitacao?.agendado_para)
  );
  if (aceiteRemarcacao.solicitacao?.status !== 'aceito' || horaAplicada !== 14) {
    throw new Error('Cliente aceitou remarcacao, mas horario novo nao foi aplicado.');
  }

  console.log('[E2E] Prestador envia conclusao para confirmacao do cliente...');
  const conclusaoPendente = await request(`/solicitacoes/${solicitacao.id}/status`, {
    method: 'PATCH',
    token: profissionalToken,
    body: JSON.stringify({ status: 'concluido' }),
  });
  if (conclusaoPendente.solicitacao?.status !== 'aguardando_confirmacao_cliente') {
    throw new Error('Conclusao do prestador nao ficou aguardando confirmacao do cliente.');
  }

  console.log('[E2E] Validando bloqueio de avaliacao antes da confirmacao do cliente...');
  await request('/avaliacoes', {
    method: 'POST',
    token: cidadaoToken,
    expectedStatus: 403,
    body: JSON.stringify({
      servico_id: solicitacao.id,
      nota_estrelas: 5,
      comentario: 'Tentativa antes da confirmacao do cliente',
    }),
  });

  console.log('[E2E] Cliente confirma a conclusao...');
  const conclusaoConfirmada = await request(
    `/solicitacoes/${solicitacao.id}/confirmar-conclusao`,
    {
      method: 'PATCH',
      token: cidadaoToken,
    }
  );
  if (conclusaoConfirmada.solicitacao?.status !== 'concluido') {
    throw new Error('Confirmacao do cliente nao concluiu o chamado.');
  }

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
  const avaliacoesPublicas = await request(
    `/avaliacoes/profissional/${profissional.id}?page=1&pageSize=20`
  );
  const avaliacaoPublica = avaliacoesPublicas.avaliacoes?.[0];
  if (
    !avaliacaoPublica ||
    avaliacaoPublica.cidadao_nome !== undefined ||
    avaliacaoPublica.servico_descricao !== undefined
  ) {
    throw new Error('Avaliacao publica ausente ou expondo dados do chamado/cidadao.');
  }

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

  console.log('[E2E] Validando revogacao da sessao HTTP e Socket.IO no logout...');
  await validarRevogacaoSocket({
    accessToken: cidadaoToken,
    descricao: 'logout',
    executarRevogacao: () => logout(cidadaoSession.refreshToken),
    solicitacaoId: solicitacao.id,
    tokenLeitor: profissionalToken,
  });
  await renovarSessao(cidadaoSession.refreshToken, 401);
  await request('/usuarios/me', {
    token: cidadaoToken,
    expectedStatus: 401,
  });

  console.log('[E2E] Validando revogacao HTTP e Socket.IO na anonimizacao...');
  const sessaoParaExcluir = await login(cidadaoEmail);
  const exclusao = await validarRevogacaoSocket({
    accessToken: sessaoParaExcluir.accessToken,
    descricao: 'exclusao de conta',
    executarRevogacao: () => request('/perfil/conta', {
      method: 'DELETE',
      token: sessaoParaExcluir.accessToken,
      body: JSON.stringify({ confirmacao: 'EXCLUIR MINHA CONTA' }),
    }),
    solicitacaoId: solicitacao.id,
    tokenLeitor: profissionalToken,
  });

  if (!Number.isInteger(exclusao.refresh_tokens_revogados) || exclusao.refresh_tokens_revogados < 1) {
    throw new Error('Exclusao de conta nao revogou os refresh tokens do usuario.');
  }

  await renovarSessao(sessaoParaExcluir.refreshToken, 401);
  await request('/usuarios/me', {
    token: sessaoParaExcluir.accessToken,
    expectedStatus: 401,
  });
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

  console.log('[E2E] Fluxo validado com sucesso!');
}

async function main() {
  const residuosAnteriores = await limparResiduosAnterioresE2E(
    contextoLimpeza
  );
  if (
    residuosAnteriores.usuariosRemovidos > 0 ||
    residuosAnteriores.arquivosRemovidos > 0
  ) {
    console.log(
      `[E2E] Setup removeu ${residuosAnteriores.usuariosRemovidos} usuario(s) `
      + `e ${residuosAnteriores.arquivosRemovidos} arquivo(s) de execucoes anteriores.`
    );
  }

  try {
    await executarFluxoE2E();
  } finally {
    fecharTodosSocketsE2E();
    const resultado = await limparResiduosE2E(contextoLimpeza);
    console.log(
      `[E2E] Limpeza concluida: ${resultado.usuariosRemovidos} usuario(s) e ${resultado.arquivosRemovidos} arquivo(s) removidos.`
    );
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[E2E] Falhou:', error.message);
    process.exit(1);
  });
}

module.exports = {
  diaSemanaAmaUc,
  horaAmaUc,
  proximoDiaUtilComHorario,
  prepararEsperaRevogacaoSocket,
  timestampLocal,
};
