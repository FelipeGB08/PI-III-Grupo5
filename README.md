# Conecta AMAUC

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
- `FCM_SERVER_KEY`

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

## Documentos finais

- `docs/HOMOLOGACAO.md`: teste em dispositivos físicos e amostragem com usuários reais.
- `docs/REGRESSAO_FINAL.md`: checklist antes de cada apresentação.
- `docs/ROTEIRO_APRESENTACAO.md`: ordem recomendada para demonstrar o sistema.

## Pendências que dependem de credenciais externas

- Envio real de e-mail para magic link/reset via SMTP.
- Login social real com configuração oficial Google/Apple/GitHub.
- Push notification real com chave Firebase/FCM.
- Chave Google Maps para uso nativo em dispositivos e mapa real no Web.
