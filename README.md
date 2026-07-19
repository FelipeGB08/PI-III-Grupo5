# Conecta AMAUC

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Plataforma regional para contratação de serviços autônomos na região da AMAUC, desenvolvida como Projeto Integrador do Curso Técnico em Informática para Internet do IFC Campus Concórdia.

## Stack

- Flutter + Riverpod
- Node.js + Express
- Socket.io para chat em tempo real
- PostgreSQL com SQL puro via `pg`
- Google Maps/Geolocator para localização e busca por raio

## Estrutura

```text
PI-III-Grupo5/
├── ca_backend/    API Node.js, migrations, seed e E2E
├── ca_frontend/   Aplicativo Flutter
├── docs/          Homologação, regressão e roteiro final
└── .github/       CI com validação backend e Flutter
```

## Como rodar do zero

Abra o terminal na raiz do projeto:

```bash
cd C:\Users\Pichau\OneDrive\Documentos\GitHub\PI-III-Grupo5
```

### Subir com Docker

Para executar somente PostgreSQL e backend sem instalar Node.js ou PostgreSQL localmente, instale Docker Desktop (Windows/macOS) ou Docker Engine com Docker Compose 2.24 ou mais recente (Linux). Na raiz do repositório, execute:

```bash
docker compose up -d
```

O Compose espera o healthcheck do PostgreSQL, aplica as migrations e, quando o banco ainda está vazio, cria automaticamente os dados de demonstração antes de iniciar o backend. Confirme os containers e a API:

```bash
docker compose ps
curl http://localhost:3000/api/status
```

No PowerShell, a verificação da API também pode ser feita com:

```powershell
Invoke-RestMethod http://localhost:3000/api/status
```

O arquivo `ca_backend/.env` é opcional para o fluxo Docker. Crie-o a partir de `.env.example` apenas se precisar configurar OAuth, SMTP, Firebase ou outros recursos; host e credenciais do PostgreSQL interno são definidos pelo Compose.

Para reaplicar migrations ou recriar os dados de demonstração dentro de um container:

```bash
docker compose run --rm migrate npm run db:migrate
docker compose run --rm migrate npm run db:seed
```

O comando de seed remove e recria os dados de simulação; não o execute sobre dados locais que queira preservar. Para acompanhar logs ou encerrar a stack:

```bash
docker compose logs -f backend
docker compose down
```

Os volumes nomeados `postgres_data` e `backend_uploads` mantêm o banco e as imagens enviadas entre reinicializações. `docker compose down -v` também apaga esses volumes e todos os dados. O Flutter continua fora do Docker e deve ser iniciado com `flutter run`, usando `API_BASE_URL` conforme a plataforma ou dispositivo físico.

### 1. Backend

```bash
cd ca_backend
npm install
copy .env.example .env
```

Edite `ca_backend/.env` com as credenciais locais do PostgreSQL e uma `JWT_SECRET` forte.

Variáveis obrigatórias:

- `JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Variáveis opcionais para recursos de produção:

- `GOOGLE_CLIENT_ID`
- `APPLE_CLIENT_ID`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `GOOGLE_APPLICATION_CREDENTIALS` ou `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`

### E-mail transacional (SMTP)

Magic link e redefinição de senha usam o Nodemailer. Quando `SMTP_HOST`, `SMTP_USER` ou `SMTP_PASS` não estão preenchidos, nenhum e-mail é enviado. Fora de produção, a API mantém o fallback local: devolve `dev_token` e registra `[EMAIL][FALLBACK_LOCAL]` no console. Em produção, a ausência de configuração é registrada como `[EMAIL][CONFIGURACAO_AUSENTE]` e o fallback fica desativado.

Falhas do provedor também aparecem no log sem revelar a senha. Credenciais recusadas usam a categoria `[EMAIL][SMTP][CREDENCIAIS_INVALIDAS]`; falhas de rede, DNS ou timeout usam `[EMAIL][SMTP][CONEXAO]`.

#### Gmail com senha de app

1. Ative a verificação em duas etapas na conta Google.
2. Gere uma senha de app para o Conecta AMAUC conforme a [documentação oficial do Google](https://support.google.com/mail/answer/185833?hl=pt-BR). Não use a senha normal da conta.
3. Preencha `ca_backend/.env`, removendo os espaços exibidos na senha de app:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=seu_email@gmail.com
   SMTP_PASS=sua_senha_de_app_de_16_caracteres
   MAIL_FROM="Conecta AMAUC <seu_email@gmail.com>"
   ```

Na porta 587, `SMTP_SECURE=false` permite que a conexão comece normalmente e seja promovida para TLS por STARTTLS. Para Gmail, mantenha o remetente igual à conta autenticada.

#### Resend para e-mail transacional

Como alternativa ao Gmail, crie uma conta no Resend, verifique um domínio remetente e gere uma API key. A [configuração SMTP oficial do Resend](https://resend.com/docs/send-with-smtp) usa o usuário fixo `resend` e a API key como senha:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_SUBSTITUA_PELA_API_KEY
MAIL_FROM="Conecta AMAUC <acesso@seu-dominio-verificado.com>"
```

O domínio de `MAIL_FROM` precisa estar verificado no Resend. Guarde a API key apenas no `.env` local ou no painel de secrets da hospedagem; nunca a envie ao Git.

#### Teste manual de entrega

O endereço usado no teste precisa estar previamente cadastrado no Conecta AMAUC, pois as rotas não revelam se um e-mail desconhecido existe. Com o backend e o banco em execução, abra outro terminal em `ca_backend` e rode:

```bash
npm run test:email -- destinatario@exemplo.com
```

O script autentica no SMTP, solicita um magic link real e um reset de senha real pela API e exige `email_enviado: true` nas duas respostas. Também é possível definir `EMAIL_TEST_TO` em vez de passar o endereço como argumento e `API_BASE_URL` para testar outra instância da API. Ao final, confirme manualmente que as duas mensagens chegaram à caixa de entrada ou ao spam; a aceitação pelo servidor SMTP não garante, sozinha, a entrega final pelo provedor do destinatário.

### Push notifications (Firebase / FCM)

O fluxo de notificações já está implementado. Para ativá-lo em um Android físico, configure o mesmo projeto Firebase (`conecta-amauc`) no aplicativo e no backend:

1. No [Firebase Console](https://console.firebase.google.com/), crie ou abra o projeto `conecta-amauc` e adicione um app **Android** com o package name `com.amauc.conecta`.
2. Baixe o arquivo `google-services.json` do app Android e salve-o em `ca_frontend/android/app/google-services.json`. Esse arquivo é local e não é versionado.
3. Com o Firebase CLI instalado e autenticado na conta Google dona do projeto, execute:

   ```bash
   cd ca_frontend
   flutterfire configure --project=conecta-amauc --platforms=android,ios,web
   ```

   Confirme o package Android `com.amauc.conecta`. O comando substitui `lib/core/firebase/firebase_options.dart`, que atualmente é um modelo com valores fictícios.
4. Em **Configurações do projeto > Contas de serviço**, gere uma chave privada para o Firebase Admin SDK. Guarde o JSON fora do repositório e, no ambiente do backend, configure uma das opções abaixo:

   ```env
   GOOGLE_APPLICATION_CREDENTIALS=C:\\caminho\\seguro\\firebase-service-account.json
   ```

   ou preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` no arquivo `ca_backend/.env` (use `\\n` na chave privada).
5. Reinicie o backend e rode o app em um aparelho Android com Google Play Services. Ao entrar na conta, o token do aparelho é enviado automaticamente para `POST /api/dispositivos/token`; os próximos eventos do sistema entregam o push via FCM.

Não use a antiga `FCM_SERVER_KEY`: o backend usa credenciais de service account pelo Firebase Admin SDK.

Crie o banco, rode migrations, seed e API:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

A API deve responder em:

```text
http://localhost:3000/api/status
```

### Documentação da API

Com o backend em execução no ambiente de desenvolvimento, a especificação OpenAPI e o Swagger UI ficam disponíveis em:

```text
http://localhost:3000/api/docs
```

A documentação é desativada por padrão quando `NODE_ENV=production`. Use `ENABLE_API_DOCS=false` para ocultá-la explicitamente em outros ambientes ou `ENABLE_API_DOCS=true` para habilitá-la de forma intencional.

### 2. Flutter

Em outro terminal:

```bash
cd ca_frontend
flutter pub get
flutter run
```

Configuração pública do app:

```text
ca_frontend/assets/env/app.env
```

Exemplo:

```env
API_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_SERVER_CLIENT_ID=
APPLE_CLIENT_ID=
APPLE_REDIRECT_URI=
```

Para dispositivo físico Android, use o IP da máquina onde o backend está rodando:

```bash
flutter run --dart-define=API_BASE_URL=http://SEU_IP:3000
```

Para Google Maps no Android, configure:

```text
ca_frontend/android/local.properties
```

```properties
MAPS_API_KEY=SUA_CHAVE_GOOGLE_MAPS
```

No Flutter Web existe fallback visual para o mapa. Para mapa real no navegador, configure a chave JavaScript do Google Maps no ambiente apropriado.

## Contas de demonstração

Após `npm run db:seed`, a senha padrão é:

```text
sim123456
```

Contas úteis:

- `ana.contratante@amauc.com`
- `joao.hidraulica@amauc.com`
- `maria.eletrica@amauc.com`
- `admin@amauc.com`

## Fluxo principal para apresentação

1. Entrar como prestador.
2. Configurar agenda com serviços, preços, duração e horários.
3. Atualizar Currículo Vivo com portfólio, certificações e dados profissionais.
4. Entrar como cidadão.
5. Buscar profissionais por cidade, categoria ou mapa.
6. Abrir o perfil público do prestador.
7. Solicitar agendamento usando um serviço da agenda configurada.
8. Abrir chat do chamado para combinar detalhes.
9. Voltar como prestador e aceitar o chamado.
10. Concluir o serviço anexando foto de evidência.
11. Voltar como cidadão e avaliar o serviço.
12. Demonstrar cancelamento com política registrada.
13. Entrar como admin e apresentar categorias/relatórios.

## Regras importantes do backend

- O backend não confia em preço, duração ou nome do serviço enviados pelo app.
- O agendamento usa `agenda_servico_id` e busca preço/duração no banco.
- Horários passados são bloqueados.
- Conflitos de horário para o mesmo prestador são bloqueados.
- Rotas sensíveis usam JWT e validação de perfil.
- Upload aceita apenas imagens e limita tamanho.
- Login/cadastro/reset/magic link têm rate limit.

## Testes

Backend:

```bash
cd ca_backend
npm run db:migrate
npm run db:seed
npm run test:e2e
```

Flutter:

```bash
cd ca_frontend
flutter analyze
flutter test
```

## CI

O workflow em `.github/workflows/ci.yml` roda automaticamente em PRs e pushes para `main/master`:

- `npm ci`
- `node --check`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run test:e2e`
- `flutter analyze`
- `flutter test`

## Deploy

O backend e um PostgreSQL gerenciado podem ser provisionados no Render pelo Blueprint [`render.yaml`](render.yaml). O Flutter não é hospedado por esse arquivo.

### Deploy pelo Blueprint

1. Envie o repositório para o GitHub e crie uma conta no [Render](https://render.com/).
2. No Dashboard do Render, escolha **New > Blueprint**, conecte este repositório e selecione o arquivo `render.yaml` da raiz.
3. Antes de confirmar, informe os valores solicitados pelo Blueprint:
   - `FRONTEND_URL`: URL pública do Flutter Web ou URL usada nos links de recuperação de senha, sem barra final.
   - `ALLOWED_ORIGINS`: origens Web autorizadas pelo CORS, com protocolo e separadas por vírgula, por exemplo `https://app.exemplo.com,https://admin.exemplo.com`.
4. Confirme a criação de `conecta-amauc-db` e `conecta-amauc-api`. O `DATABASE_URL` é ligado automaticamente ao banco e o `JWT_SECRET` é gerado pelo Render; nenhum desses valores deve ser copiado para o repositório.
5. No plano gratuito, o Render executa `npm run db:migrate` no início do serviço e `npm run db:seed` somente após o primeiro deploy. Para um ambiente de produção com dados reais, remova `initialDeployHook: npm run db:seed` do `render.yaml` antes de criar o Blueprint. Em um serviço pago, a migration pode ser movida para `preDeployCommand`.
6. Quando o serviço ficar disponível, copie sua URL pública e valide:

   ```bash
   curl https://SEU-SERVICO.onrender.com/api/status
   ```

   A resposta esperada tem status HTTP `200` e contém a mensagem de que a API está rodando.

O Blueprint deixa o auto-deploy do Render desativado. Para publicar somente depois do CI, abra **Settings > Deploy Hook** no serviço, copie a URL e crie no GitHub o secret de Actions `RENDER_DEPLOY_HOOK_URL`. Em pushes para `main`, o job `Deploy Render` será executado depois dos testes. Sem esse secret, o job apenas informa que o deploy foi ignorado e o CI continua verde.

### Configuração manual no Render

Se o Blueprint não estiver disponível, faça o mesmo provisionamento pelo Dashboard:

1. Crie um **Render Postgres** versão 16 e guarde a Internal Database URL.
2. Crie um **Web Service** conectado a este repositório com estas opções:
   - Root Directory: `ca_backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Pre-Deploy Command: deixe vazio no plano gratuito; em planos pagos, use `npm run db:migrate`
   - Start Command: `npm run db:migrate && npm start`
   - Health Check Path: `/api/status`
3. Cadastre as variáveis abaixo no ambiente do serviço, usando `ca_backend/.env.example` como referência:

   | Variável | Valor no deploy |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Internal Database URL do PostgreSQL gerenciado |
   | `JWT_SECRET` | Segredo aleatório forte, diferente do ambiente local |
   | `FRONTEND_URL` | URL pública usada nos links enviados por e-mail |
   | `ALLOWED_ORIGINS` | Origens Web permitidas, separadas por vírgula |
   | `ENABLE_API_DOCS` | `false` |

4. Configure Google, Apple, GitHub, SMTP e Firebase somente se esses recursos forem usados. Os nomes esperados estão em `ca_backend/.env.example`; credenciais devem existir apenas no painel do Render.
5. Faça o primeiro deploy. A migration será executada pelo Pre-Deploy Command. Para uma demonstração com as contas fictícias, abra o Shell do serviço e execute uma única vez:

   ```bash
   npm run db:seed
   ```

   Em produção real, não execute o seed. No plano gratuito, o Start Command acima aplica migrations idempotentes antes de iniciar a API.
6. Acesse `https://SEU-SERVICO.onrender.com/api/status` e confirme o status `200`.

### Apontar o Flutter para a API pública

O arquivo `ca_frontend/assets/env/app.env` permanece sem URL fixa para não quebrar `flutter run` local. Depois do deploy, passe a URL pública no build de release:

```bash
cd ca_frontend
flutter build apk --release --dart-define=API_BASE_URL=https://SEU-SERVICO.onrender.com
flutter build web --release --dart-define=API_BASE_URL=https://SEU-SERVICO.onrender.com
```

Para testar a mesma API pública sem gerar um build:

```bash
flutter run --dart-define=API_BASE_URL=https://SEU-SERVICO.onrender.com
```

Não coloque `JWT_SECRET`, `DATABASE_URL`, credenciais SMTP, Firebase ou OAuth em `app.env`: tudo que entra no aplicativo Flutter é público. No plano sem disco persistente, arquivos gravados em `ca_backend/uploads` podem desaparecer em reinicializações ou novos deploys; antes de uso em produção, configure armazenamento persistente ou um serviço de objetos.

## Documentos finais

- `docs/HOMOLOGACAO.md`: teste em dispositivos físicos e amostragem com usuários reais.
- `docs/LOGIN_SOCIAL.md`: configuração de produção e limitações atuais de Google, Apple e GitHub.
- `docs/PUSH_NOTIFICATIONS.md`: eventos FCM, configuração e teste ponta a ponta em dispositivo físico.
- `docs/REGRESSAO_FINAL.md`: checklist antes de cada apresentação.
- `docs/ROTEIRO_APRESENTACAO.md`: ordem recomendada para demonstrar o sistema.

## Pendências que dependem de credenciais externas

- Credenciais SMTP reais e domínio remetente verificado para entrega de magic link/reset.
- Login social real com configuração oficial Google/Apple/GitHub.
- Push notification real com chave Firebase/FCM.
- Chave Google Maps para uso nativo em dispositivos e mapa real no Web.
