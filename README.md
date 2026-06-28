# Conecta AMAUC

MVP acadêmico de uma plataforma regional para contratação de serviços autônomos na região da AMAUC.

## Stack

- Flutter + Riverpod
- Node.js + Express
- Socket.io para chat em tempo real
- PostgreSQL com SQL puro via `pg`

## Como abrir o projeto

```bash
cd C:\Users\Pichau\OneDrive\Documentos\GitHub\PI-III-Grupo5
```

## Backend

```bash
cd ca_backend
npm install
copy .env.example .env
```

Edite o arquivo `ca_backend/.env` com as credenciais do PostgreSQL e uma `JWT_SECRET` forte.

Variáveis principais:

- `JWT_SECRET`: chave usada para assinar JWT.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: conexão PostgreSQL.
- `GOOGLE_CLIENT_ID` e `APPLE_CLIENT_ID`: validação de login social.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: envio real de magic link/reset.
- `FRONTEND_URL`: URL usada nos links enviados por e-mail.

Criar tabelas, seed e subir API:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

A API roda em `http://localhost:3000`.

Teste E2E:

```bash
npm run test:e2e
```

## Flutter

```bash
cd ca_frontend
flutter pub get
flutter run
```

Configuração do app fica em:

```text
ca_frontend/assets/env/app.env
```

Esse arquivo deve conter apenas valores públicos do app, como URL da API e client IDs. Segredos reais ficam somente no backend.

Exemplo:

```env
API_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_SERVER_CLIENT_ID=
APPLE_CLIENT_ID=
APPLE_REDIRECT_URI=
```

Para o mapa no Android, configure a chave do Google Maps em `ca_frontend/android/local.properties`:

```properties
MAPS_API_KEY=SUA_CHAVE_GOOGLE_MAPS
```

Também é possível sobrescrever por CI/linha de comando:

```bash
flutter run --dart-define-from-file=env/dev.json
```

Para dispositivo físico Android, use o IP da máquina do backend:

```bash
flutter run --dart-define=API_BASE_URL=http://SEU_IP:3000
```

## Contas de demonstração

O seed cria usuários com senha:

```text
sim123456
```

Exemplos:

- `ana.contratante@amauc.com`
- `joao.hidraulica@amauc.com`
- `maria.eletrica@amauc.com`
- `admin@amauc.com`

## Fluxo principal para apresentação

1. Entrar como prestador/profissional.
2. Configurar agenda: serviços, preços, duração e horários disponíveis.
3. Entrar como cidadão/cliente.
4. Buscar profissional por cidade/categoria.
5. Escolher um serviço da agenda do prestador e solicitar agendamento.
6. Abrir o chat do chamado para combinar detalhes entre cliente e prestador.
7. Abrir o mapa de prestadores e demonstrar busca por raio/distância.
8. Voltar como prestador e aceitar o chamado.
9. Como prestador, concluir o chamado após o atendimento.
10. Voltar como cliente e avaliar o serviço concluído.
11. Demonstrar o Currículo Vivo/perfil público do prestador.
12. Entrar como admin e demonstrar categorias/relatórios.

O backend valida o agendamento usando dados do banco. O app informa apenas `agenda_servico_id`, profissional, endereço, descrição e horário desejado. Preço, nome do serviço e duração vêm da agenda configurada pelo prestador.

## CI

O workflow em `.github/workflows/ci.yml` roda automaticamente em PRs e pushes para `main/master`:

- `npm ci`
- `node --check`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run test:e2e`
- `flutter analyze`
- `flutter test`

## Homologação prática

O roteiro de teste em dispositivos físicos e a amostragem com 10 usuários reais estão em `docs/HOMOLOGACAO.md`.
