# Como contribuir

Obrigado por contribuir com o Conecta AMAUC. Antes de começar, siga a seção [Como rodar do zero](README.md#como-rodar-do-zero) do README para configurar PostgreSQL, backend e aplicativo Flutter.

## Branches e alterações

Crie a branch a partir de `main` e use nomes curtos, em minúsculas e separados por hífen:

- `feature/nome-da-feature` para funcionalidades.
- `fix/nome-do-ajuste` para correções.
- `refactor/nome-do-refactor` para reorganizações sem mudança de comportamento.
- `docs/nome-da-documentacao` para documentação.

Mantenha cada branch e pull request focados em uma única mudança. Não versione arquivos `.env`, credenciais, chaves ou artefatos de build.

## Testes antes do pull request

No diretório `ca_backend/`, execute:

```bash
npm test
npm run test:e2e
```

O E2E exige PostgreSQL disponível, migrations aplicadas e a API em execução, conforme explicado no README.

No diretório `ca_frontend/`, execute:

```bash
flutter analyze
flutter test
```

Corrija qualquer falha antes de abrir o pull request e descreva no PR quais comandos foram executados.

## Checklist de merge

Antes de solicitar merge em `main`, percorra o checklist de [Regressão Final](docs/REGRESSAO_FINAL.md). O pull request deve explicar o objetivo da mudança, os principais arquivos alterados e eventuais passos manuais de validação.
