# Fechamento do projeto — Conecta AMAUC

Data da execução: 9 de agosto de 2026.

Este documento complementa o histórico de `REVISAO_FINAL.md` com o estado
verificado nesta execução. Não houve commit, push, alteração de painel externo,
deploy, keystore ou credencial real.

## Evidências executadas

| Comando ou verificação | Resultado real |
| --- | --- |
| `ca_backend: npm install` | Concluiu; 659 pacotes auditados. O aviso automático reportou 8 vulnerabilidades moderadas. |
| `ca_backend: npx jest --coverage --runInBand` | **63 suítes, 443 testes aprovados**, 0 falhas. Cobertura global: 78,98% statements, 71,01% branches, 94% functions e 80,64% lines. |
| `ca_backend: npm run db:migrate` | Banco PostgreSQL local disponível. Aplicou as migrations 023, 024 e 025; 001–022 já estavam aplicadas. |
| `ca_backend: npm run test:migrations` | Aprovado: 25 migrations validadas em banco descartável com 21 tabelas; banco removido ao fim. |
| `ca_backend: npm run test:e2e` | Primeira tentativa sem API local retornou `fetch failed`. Com a API local iniciada, a primeira chamada revelou migrations pendentes (`rate_limit_buckets` inexistente); depois de `db:migrate`, o E2E passou integralmente, incluindo HTTP, Socket.IO e limpeza de 3 usuários/1 arquivo de teste. |
| `ca_backend: npm audit --json` | 0 critical, 0 high, 0 low e **8 moderate**. A cadeia e as justificativas são as mesmas de `SECURITY.md`; nenhuma atualização foi necessária. |
| Teste direcionado de cruzamentos | `npx jest ... --coverage=false --runInBand`: 4 suítes e 63 testes aprovados (cidade secundária, avaliações, coordenadas e paridade Swagger). A flag sem cobertura é necessária porque thresholds globais tornam qualquer execução parcial vermelha, embora as asserções passem. |
| `ca_frontend: flutter pub get` | Aprovado após habilitar o Modo de Desenvolvedor do Windows. O resolvedor local alterou 11 dependências transitivas e arquivos gerados; essas alterações foram restauradas porque não fazem parte de uma atualização deliberada de dependências. |
| `ca_frontend: flutter analyze` | **Aprovado:** `No issues found!` (75,5 s). |
| `ca_frontend: flutter test --reporter compact` | **68 testes aprovados**, 0 falhas (`All tests passed!`). Foi executado em segundo plano porque o limite de 60 s do terminal fecha o pipe do Flutter. |
| Varredura final | `git diff --check` não reportou erros. Busca por `TODO`/`FIXME` não encontrou pendências em código de aplicação; há somente comentários padrão em CMake gerado pelo Flutter. |

O aviso do Flutter de que há uma versão mais nova do SDK também foi exibido.
Ele não é aviso do projeto e nenhuma atualização de SDK foi feita.

## Cruzamentos das funcionalidades recentes

| Item | O que foi confirmado por teste | Resultado |
| --- | --- | --- |
| Múltiplas cidades | Foi adicionado o teste `ProfissionalModel - encontra profissional pela cidade secundaria de atendimento`. Ele confirma que a busca pública usa `u.cidade_amauc = $1 OR $1 = ANY(pp.cidades_atendidas)` com parâmetro preparado, encontrando um profissional de Concórdia ao buscar Itá. A suíte completa passou. | Confirmado. |
| Avaliação privada do cliente | O E2E criou a avaliação somente após a conclusão, rejeitou duplicidade com 400 e rejeitou cidadão na rota de profissional com 403. `AvaliacaoController.test.js` cobre profissional de outro serviço; a rota pública serializa somente campos da avaliação do profissional e a rota de consulta privada exige admin. | Confirmado. |
| Confirmação dupla | O E2E enviou a conclusão do prestador, comprovou bloqueio da avaliação antes da confirmação do cliente, confirmou a conclusão e só então realizou as avaliações pública e privada. O teste de controller também bloqueia status `aguardando_confirmacao_cliente`. | Confirmado. |
| Localização automática | `resourceSchemas.test.js` rejeita latitude sem longitude, latitude fora de `[-90, 90]` e longitude fora de `[-180, 180]`. O E2E confirmou o armazenamento das coordenadas válidas do atendimento. | Confirmado. |

## Documentação, rotas e resíduos

- `docs/ROTEIRO_APRESENTACAO.md` agora distingue os recursos já implementados
  (e-mail, login social Google, push/FCM e configuração de deploy) das
  credenciais, publicação e infraestrutura ainda externas.
- `docs/HOMOLOGACAO.md` passou a incluir cidade secundária, confirmação dupla e
  a avaliação privada na homologação prática.
- `README.md` deixa claro que e-mail, login social e push estão implementados;
  o que falta são credenciais de produção, deploy real, assinatura e loja.
- `docs/ROUTE_ACCESS.md` agora cobre verificação de profissional, denúncia,
  avaliação privada e administração de usuários, além dos endpoints
  administrativos correlatos.
- O teste `Swagger da API versionada` passou dentro da suíte completa e compara
  as operações declaradas nos routers com o Swagger. A inspeção dos 14 routers
  confirmou JWT e papéis nas novas ações; denúncia fica autenticada e valida a
  participação do usuário no controller, que é a regra apropriada ao recurso.
- A comparação entre `process.env` e `.env.example` encontrou somente
  `GRACEFUL_SHUTDOWN_TIMEOUT_MS` sem documentação; ela foi adicionada ao
  exemplo. Não foram removidas variáveis que ainda são lidas.

## Fora do escopo versionável antes da entrega

- Deploy real da API e configuração de produção.
- Credenciais de produção para SMTP, Google e Firebase/FCM.
- Keystore e assinatura do APK/AAB de release.
- Publicação na Play Store.
- Homologação em aparelhos físicos e com usuários reais, conforme
  `docs/HOMOLOGACAO.md`.
- Decisões de escopo já assumidas pelo grupo, como não introduzir onboarding
  adicional ou múltiplos serviços no mesmo chamado nesta fase.

## Pronto para apresentação: sim

O backend, migrations, E2E, audit, `flutter pub get`, `flutter analyze` sem
avisos e 68 testes Flutter passaram. As verificações específicas de múltiplas
cidades, avaliação privada, confirmação dupla e validação de coordenadas
também estão cobertas e aprovadas. As pendências restantes são operacionais
(credenciais de produção, deploy, assinatura e publicação) e não bloqueiam a
apresentação local validada neste fechamento.
