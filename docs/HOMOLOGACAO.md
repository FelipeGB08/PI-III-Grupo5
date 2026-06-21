# Protocolo de Homologacao Pratica - Conecta AMAUC

## 1. Ambiente local para teste ponta a ponta

### Backend e banco

```bash
cd ca_backend
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Em outro terminal:

```bash
cd ca_backend
npm run test:e2e
```

O teste E2E cria um cidadao e um profissional, faz login, cria Curriculo Vivo,
solicita orcamento, aceita, conclui e registra avaliacao.

### Flutter

Em emulador Android:

```bash
cd ca_frontend
flutter run
```

Em dispositivo fisico Android:

```bash
flutter run --dart-define=API_BASE_URL=http://IP_DA_MAQUINA:3000
```

## 2. Checklist tecnico durante o teste

- Cadastro retorna token JWT no login.
- Cidade enviada no cadastro pertence a AMAUC.
- Busca de profissionais renderiza sem travar a UI.
- Solicitacao aparece para o profissional.
- Profissional consegue aceitar e concluir.
- Cidadao consegue avaliar servico concluido.
- Curriculo Vivo salva biografia, experiencia, resumo e portfolio.
- Admin consegue visualizar relatorios e gerenciar categorias.
- GPS solicita permissao no dispositivo fisico.
- Camera/galeria permite anexar imagem quando aplicavel.

## 3. Amostragem obrigatoria

Base controlada: 10 usuarios reais da regiao AMAUC.

### Grupo A - 5 cidadaos locais

Foco:

- Cadastro e login.
- Busca por cidade/categoria.
- Visualizacao de Curriculo Vivo.
- Solicitacao de orcamento.
- Avaliacao apos conclusao.

Perguntas de validacao:

- Encontrou a categoria desejada?
- Entendeu o status do chamado?
- A tela ficou legivel em ambiente externo?
- O fluxo parece confiavel para contratar alguem?

### Grupo B - 5 profissionais autonomos

Foco:

- Cadastro como profissional.
- Criacao/edicao do Curriculo Vivo.
- Recebimento de chamados.
- Aceite/recusa/conclusao.
- Visualizacao do proprio perfil.

Perguntas de validacao:

- O Curriculo Vivo representa bem seu trabalho?
- Os campos sao claros?
- A gestao dos chamados e facil?
- O app transmite confianca profissional?

## 4. Registro de evidencias

Para cada participante, registrar:

- Perfil: cidadao ou profissional.
- Cidade AMAUC.
- Modelo do aparelho.
- Android/iOS e versao.
- Fluxo testado.
- Resultado: aprovado, aprovado com ressalva ou falhou.
- Observacoes objetivas.

## 5. Criterio de aceite da homologacao

O APK esta aprovado para apresentacao se:

- Pelo menos 8 de 10 usuarios concluem seu fluxo principal sem ajuda tecnica.
- Nenhuma falha bloqueia cadastro, login, busca, solicitacao ou avaliacao.
- GPS e camera/galeria funcionam em pelo menos 2 aparelhos fisicos.
- Todos os problemas encontrados estao registrados com prioridade.
