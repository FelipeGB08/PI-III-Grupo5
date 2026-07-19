# Medição de desempenho da API

## Situação atual

Ainda não há uma URL de produção ou de staging confirmada nem credenciais de
teste no repositório. Por isso, **nenhum teste de carga foi executado** e não
há métricas reais de RPS, p95 ou usuários simultâneos para registrar. Este
documento define o procedimento reproduzível para obter esses números sem
afetar usuários reais.

A verificação do endpoint público citado no repositório confirmou que ele ainda
está em uma versão anterior: a primeira tentativa expirou em 15 segundos
(compatível com cold start), `GET /api/v1/status` respondeu `404` na tentativa
seguinte e o alias legado `GET /api/status` respondeu `200`. Esse deploy não é,
portanto, um alvo válido para medir a versão atual da API; é necessário publicar
a versão com `/api/v1` ou usar um staging equivalente antes do teste.

> Conexões simultâneas do autocannon não são uma contagem exata de pessoas
> usando o aplicativo. Elas representam requisições concorrentes e servem como
> uma aproximação comparável entre execuções.

## Ambiente e segurança

- Prefira um ambiente de **staging** com banco e contas exclusivos para teste.
- Em produção, execute somente com autorização do grupo, fora do horário de
  pico, começando com pouca concorrência e acompanhando os logs do Render.
- Não use contas, solicitações ou agendas de pessoas reais.
- O login tem limite de **10 tentativas a cada 15 minutos por combinação de
  IP e e-mail**. Para medi-lo, use uma lista de contas de teste ou aumente o
  limite apenas no staging; não desabilite esse limite em produção.
- A criação de solicitação grava dados, pode gerar notificações e tem limite de
  **20 criações por hora por usuário**. Portanto, esse cenário deve ser
  executado somente no staging, com dados descartáveis.

## Pré-requisitos a configurar pelo grupo

1. URL pública do ambiente autorizado, incluindo o prefixo canônico
   `/api/v1`.
2. Conta de cidadão exclusiva para carga (`e-mail` e senha) e uma agenda de
   profissional de teste com um horário futuro disponível.
3. Acesso aos logs e métricas do Render e, se possível, às métricas do
   PostgreSQL durante a execução.
4. Dependências instaladas no backend (`npm install`).

Nenhuma dessas credenciais ou URLs deve ser versionada no repositório.

## Como executar

O script `npm run test:load` usa o autocannon. No PowerShell, configure as
variáveis somente na sessão atual e rode um patamar por vez:

```powershell
cd ca_backend
$env:LOAD_TEST_BASE_URL = 'https://URL-DO-AMBIENTE/api/v1'
$env:LOAD_TEST_LOGIN_EMAIL = 'carga.cidadao@example.test'
$env:LOAD_TEST_PASSWORD = 'senha-da-conta-de-teste'
$env:LOAD_TEST_CONNECTIONS = '5'
$env:LOAD_TEST_DURATION_SECONDS = '30'
$env:LOAD_TEST_CONFIRM = 'AUTORIZO_TESTE_DE_CARGA'
npm run test:load
```

Comece com 1, 5 e 10 conexões, mantendo a duração de 30 segundos. Só aumente
o próximo patamar se o anterior não apresentar uma proporção relevante de
erros. Registre a saída integral do script junto com a data, região do Render
e plano usado.

Com apenas `LOAD_TEST_LOGIN_EMAIL` e `LOAD_TEST_PASSWORD`, o cenário de login
faz uma única requisição para não acionar a proteção antiabuso. Para medir
login com concorrência de forma representativa, configure um pool de contas
descartáveis (e mantenha no máximo nove requisições por conta, pois a sessão
inicial também pode consumir uma tentativa):

```powershell
$env:LOAD_TEST_LOGIN_PAYLOADS = '[{"email":"carga-01@example.test","senha":"senha-de-teste"},{"email":"carga-02@example.test","senha":"senha-de-teste"}]'
$env:LOAD_TEST_LOGIN_REQUESTS_PER_ACCOUNT = '5'
npm run test:load
```

Para incluir a criação de solicitações, use **apenas em staging** e forneça um
payload já validado, com IDs e horário da agenda de teste:

```powershell
$env:LOAD_TEST_ENABLE_CREATE = 'true'
$env:LOAD_TEST_ENVIRONMENT = 'staging'
$env:LOAD_TEST_CREATE_BODY = '{"profissional_id":456,"agenda_servico_id":123,"descricao":"Solicitacao exclusiva de teste de carga","agendado_para":"2030-01-15T14:00:00.000Z"}'
npm run test:load
```

O script exige `LOAD_TEST_CONFIRM=AUTORIZO_TESTE_DE_CARGA`. A criação exige,
além disso, `LOAD_TEST_ENABLE_CREATE=true`, `LOAD_TEST_ENVIRONMENT=staging` e
`LOAD_TEST_CREATE_BODY` em JSON. Essa é uma trava local: o script não consegue
confirmar sozinho se a URL realmente é de staging; nunca defina essas variáveis
para uma URL de produção. A criação deve ter concorrência baixa e ser feita com
dados descartáveis, pois conflitos de horário e respostas `429` não medem a
capacidade útil da API. Também é possível fornecer um array de até 20 payloads
únicos em `LOAD_TEST_CREATE_BODY` para evitar conflitos de horário.

## Cenários medidos

| Cenário | Endpoint | Método | Dados necessários |
| --- | --- | --- | --- |
| Login | `/auth/login` | `POST` | Contas de teste; idealmente mais de uma para não acionar o rate limit |
| Listagem de chamados | `/solicitacoes/meus-pedidos?page=1&pageSize=20` | `GET` | Access token da conta de teste |
| Criação de solicitação | `/solicitacoes` | `POST` | Conta, agenda, serviço e horário futuros de staging |

## Resultados

Preencha esta tabela após cada execução. Os campos permanecem como pendentes
porque não foi feita uma medição autorizada até o momento.

| Data/ambiente | Cenário | Conexões | Duração | RPS médio | Latência p95 | Erros 4xx | Erros 5xx/rede | Observações |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Pendente | Login | — | — | — | — | — | — | Sem URL/credenciais de teste confirmadas |
| Pendente | Listagem de chamados | — | — | — | — | — | — | Sem URL/credenciais de teste confirmadas |
| Pendente | Criação de solicitação (staging) | — | — | — | — | — | — | Sem ambiente isolado configurado |

Considere como capacidade inicial o maior patamar que mantém erros de servidor
e de rede próximos de zero e p95 dentro do objetivo definido pelo grupo. Não
conte respostas `429`, conflitos de horário ou validações de payload como
capacidade sustentada: elas indicam que o teste ou os dados precisam ser
ajustados.

## Gargalos a observar

Não há gargalo confirmado sem medições. Durante o teste, verifique
especialmente:

- **Inicialização a frio e CPU compartilhada do Render:** compare a primeira
  execução com as seguintes e acompanhe p95.
- **Login:** consulta ao PostgreSQL, comparação de senha com bcrypt e gravação
  do refresh token ocorrem em cada autenticação.
- **Listagem:** filtros, paginação e o uso dos índices de
  `servicos_solicitados` devem ser observados no PostgreSQL.
- **Criação:** validação de agenda/conflito, escrita no banco e disparo de
  notificações podem aumentar a latência; por isso esse cenário fica isolado
  no staging.

Anexe ao registro qualquer aumento de p95, erro `5xx`, timeout, reinício da
instância ou saturação observada nos logs. Só após essa coleta é possível
afirmar quantos usuários simultâneos o plano gratuito suporta.
