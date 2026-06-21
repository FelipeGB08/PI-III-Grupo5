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

Criar tabelas e dados de demonstracao:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

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

1. Entrar como cidadao.
2. Buscar profissional por cidade/categoria.
3. Solicitar um servico.
4. Entrar como profissional e aceitar/concluir o chamado.
5. Voltar como cidadao e avaliar o servico concluido.
6. Entrar como profissional e atualizar o Curriculo Vivo.
7. Entrar como admin e demonstrar categorias/relatorios.

## Homologacao pratica

O roteiro de teste em dispositivos fisicos e a amostragem com 10 usuarios reais
estao em `docs/HOMOLOGACAO.md`.
