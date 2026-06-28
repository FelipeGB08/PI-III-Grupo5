# Conecta AMAUC

MVP academico de uma plataforma regional para contratacao de servicos autonomos.

## Stack

- Flutter + Riverpod
- Node.js + Express
- PostgreSQL com SQL puro via `pg`

## Backend

```bash
cd ca_backend
npm install
copy .env.example .env
```

Edite o arquivo `.env` com as credenciais do PostgreSQL e uma `JWT_SECRET`.
Para login social e recuperacao de senha em modo real, configure tambem:

- `GOOGLE_CLIENT_ID`: client ID usado pelo backend para validar o ID token.
- `APPLE_CLIENT_ID`: Services ID/Bundle ID usado para validar o token Apple.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`: envio real de magic link/reset.
- `FRONTEND_URL`: URL usada nos links enviados por e-mail.

Criar tabelas e dados de demonstracao:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

O comando `npm run db:migrate` aplica migrations incrementais em
`ca_backend/migrations` e nao recria o banco.

A API sobe em `http://localhost:3000`.

Teste automatizado do fluxo principal:

```bash
npm run test:e2e
```

## Flutter

```bash
cd ca_frontend
flutter pub get
flutter run
```

Para dispositivo fisico Android, informe o IP da maquina do backend:

```bash
flutter run --dart-define=API_BASE_URL=http://SEU_IP:3000
```

Para testar login social real, informe tambem as chaves do provedor no Flutter:

```bash
flutter run ^
  --dart-define=API_BASE_URL=http://SEU_IP:3000 ^
  --dart-define=GOOGLE_SERVER_CLIENT_ID=SEU_GOOGLE_WEB_CLIENT_ID ^
  --dart-define=GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID ^
  --dart-define=APPLE_CLIENT_ID=SEU_APPLE_SERVICES_ID ^
  --dart-define=APPLE_REDIRECT_URI=https://SEU_DOMINIO/callbacks/sign_in_with_apple
```

No Google, o `GOOGLE_SERVER_CLIENT_ID` deve bater com o `GOOGLE_CLIENT_ID`
configurado no backend quando o backend validar a audiencia do ID token. No
GitHub, o app usa um access token real do GitHub e o backend valida esse token
diretamente na API do GitHub.

## Contas de demonstracao

O seed cria usuarios com senha:

```text
sim123456
```

Exemplos:

- `ana.contratante@amauc.com`
- `joao.hidraulica@amauc.com`
- `maria.eletrica@amauc.com`
- `admin@amauc.com`

## Fluxo principal para a apresentacao

1. Entrar como prestador/profissional.
2. Configurar a agenda: servicos, precos, duracao e horarios disponiveis.
3. Entrar como cidadao/cliente.
4. Buscar profissional por cidade/categoria.
5. Escolher um servico da agenda do prestador e solicitar o agendamento.
6. Voltar como prestador e aceitar o chamado.
7. Como prestador, concluir o chamado apos o atendimento.
8. Voltar como cliente e avaliar o servico concluido.
9. Demonstrar o Curriculo Vivo/perfil publico do prestador.
10. Entrar como admin e demonstrar categorias/relatorios.

O backend valida o agendamento usando os dados do banco: o app informa apenas
`agenda_servico_id`, profissional, endereco, descricao e horario desejado. O
preco, nome do servico e duracao sao carregados da agenda configurada pelo
prestador.

## Homologacao pratica

O roteiro de teste em dispositivos fisicos e a amostragem com 10 usuarios reais
estao em `docs/HOMOLOGACAO.md`.
