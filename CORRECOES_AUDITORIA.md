# Correções da auditoria técnica

Data da validação final: 29/07/2026  
Projeto: Conecta AMAUC  
Relatório de origem: `AUDITORIA_COMPLETA.md`

## Resumo executivo

Foram tratados todos os 17 achados. Os bloqueadores P0/P1 e todos os P2 foram
corrigidos e possuem testes de regressão. Dos três itens P3, o encerramento
gracioso foi concluído; a divisão dos arquivos grandes e as atualizações de
versão principal foram iniciadas de forma incremental e permanecem
parcialmente corrigidas, pois a própria auditoria classifica esse trabalho como
gradual e de alto risco.

| Severidade | Corrigidos | Parciais | Bloqueados |
| --- | ---: | ---: | ---: |
| P0 | 1/1 | 0 | 0 |
| P1 | 4/4 | 0 | 0 |
| P2 | 9/9 | 0 | 0 |
| P3 | 1/3 | 2/3 | 0 |
| **Total** | **15/17** | **2/17** | **0** |

Não permanece aberto nenhum P0 ou P1.

## Situação dos achados

| ID | Status | Implementação e principais arquivos/linhas | Evidência de teste |
| --- | --- | --- | --- |
| AUD-001 | **Corrigido** | O schema aceita somente caminho local seguro de upload; o upload cria uma reivindicação ligada ao usuário e a criação do chamado consome essa reivindicação atomicamente. No Flutter, `Authorization` só é anexado quando esquema, host e porta coincidem com a API; mídia externa usa outro cliente sem autenticação. `solicitacaoSchemas.js`; `UploadClaimModel.js:4-13`; `uploadRoutes.js:62`; `ServicoModel.js:8-56`; `api_config.dart:133-142`; `auth_interceptor.dart:34-72`; `api_service.dart:72-84`. | `securityRemediation.test.js`; `uploadRoutes.test.js`; `auth_interceptor_test.dart` (“nunca envia bearer…”); `api_service_test.dart` (“mídia externa…”). |
| AUD-002 | **Corrigido** | O reset troca o hash da senha e revoga todos os refresh tokens dentro da mesma transação PostgreSQL. `PasswordTokenModel.js:27-72`; `PasswordResetController.js:169-195`. | `PasswordTokenModel.test.js` confirma troca e revogação na mesma transação. |
| AUD-003 | **Corrigido** | Magic link e reset persistem apenas o hash e usam consumo condicional atômico (`consumido_em IS NULL`, validade e finalidade). `PasswordTokenModel.js:4-81`; `PasswordResetController.js:64-109,169-195`; `passwordTokenStore.js`. | Teste concorrente comprova que somente uma de duas tentativas consome o token. |
| AUD-004 | **Corrigido** | `trust proxy` aceita somente quantidade explícita de saltos confiáveis (0–5); Render usa um salto. A chave de refresh combina IP normalizado com impressão SHA-256 do token, evitando bloqueio coletivo. `trustProxy.js:1-12`; `server.js:30-47`; `rateLimitMiddleware.js:48-117`; `render.yaml`. | `trustProxy.test.js`; `rateLimitMiddleware.test.js` cobre sessões distintas atrás do mesmo IP. |
| AUD-005 | **Corrigido** | Seed sempre recusa produção, exige duas confirmações locais, valida o nome exato do banco, executa em transação e remove somente contas sintéticas conhecidas. O hook de seed foi retirado do Render. `scripts/seed.js:73-112,220-309`; `render.yaml`; `docker-compose.yml`. | `seedSafety.test.js` cobre produção, flags ausentes e SQL restrito. Nenhum seed foi executado durante a auditoria. |
| AUD-006 | **Corrigido** | Transporte Flutter usa ISO UTC; banco usa `TIMESTAMPTZ`; conversão da migration declara `America/Sao_Paulo` para os timestamps legados; regras de agenda usam `Intl` com fuso de negócio explícito. `chamado_model.dart:89`; `api_service.dart:933`; `agendamentoValidator.js:10-125`; migration 023:72-84. | `agendamentoValidator.test.js` compara o mesmo caso sob `TZ=UTC` e `TZ=America/Sao_Paulo`. |
| AUD-007 | **Corrigido** | Os `Map` voláteis foram substituídos por `recovery_tokens` no PostgreSQL, com hash, finalidade, expiração, consumo e limpeza. `PasswordTokenModel.js`; migration 023:1-15. | `PasswordTokenModel.test.js` e testes do controller. |
| AUD-008 | **Corrigido** | Rate limit compartilhado usa contador atômico no PostgreSQL e chave irreversível. O armazenamento em memória ficou limitado a 10.000 chaves e é usado somente nos testes. `rateLimitStore.js:1-49`; `rateLimitMiddleware.js`; migration 023:17-24. | `rateLimitStore.test.js` cobre SQL compartilhado, hash e reset; suíte de middlewares cobre limites. |
| AUD-009 | **Corrigido** | Exportação CSV prefixa apóstrofo antes de células iniciadas por `=`, `+`, `-`, `@`, tab ou retorno de carro, preservando o escape CSV. `RelatorioController.js:4-19`. | `securityRemediation.test.js` testa todos os prefixos perigosos. |
| AUD-010 | **Corrigido** | Interceptor que imprimia corpos foi removido. Logger do backend redige recursivamente senha, tokens, autorização, cookies, credenciais, endereço e coordenadas. `dio_client.dart`; `api_config.dart`; `logger.js:1-71`; `PasswordResetController.js`. | `loggerRedaction.test.js` verifica que valores sensíveis não aparecem. Verificação adicional do diff não encontrou segredo novo. |
| AUD-011 | **Corrigido** | Cadastro e reset compartilham mínimo de 10 caracteres e máximo de 72 bytes UTF-8, compatível com bcrypt. Login existente mantém compatibilidade sem enfraquecer cadastro/reset. `passwordPolicy.js`; `authSchemas.js`; `PasswordResetController.js`; `form_validators.dart:17-33`; telas de autenticação. | Testes de schema e `form_validators_test.dart` cobrem mínimo e máximo em bytes. |
| AUD-012 | **Corrigido** | Schemas agora são estritos, com tipos e limites; foto externa e campos desconhecidos são recusados; violações PostgreSQL previsíveis viram 400. `authSchemas.js`; `solicitacaoSchemas.js`; `errorHandler.js:20-43`. | `resourceSchemas.test.js` e `securityRemediation.test.js` cobrem campos extras, textos grandes, foto e senha. |
| AUD-013 | **Corrigido** | Cada chamado guarda `categoria_id` contratada. Profissional com várias categorias exige seleção explícita; remarcação preserva o snapshot. Relatório consulta essa categoria, não as categorias atuais do profissional. `ServicoModel.js:20-52`; `SolicitacaoController.js:179-196,695-709`; `agendamentoValidator.js:79-125`; `RelatorioModel.js:35-43`; tela `agendar_servico_screen.dart`. | `relatorioModel.test.js`, `agendamentoValidator.test.js` e testes Flutter de agendamento. |
| AUD-014 | **Corrigido** | Foram adicionados índices para FKs de agenda, categoria, OAuth, cancelamento, revisão, denúncia e solicitações. Migration 023:54-70. | Replay das 23 migrations em banco descartável criou 20 tabelas e foi removido ao final. |
| AUD-015 | **Corrigido** | SIGTERM/SIGINT param novas conexões, fecham Socket.IO, servidor HTTP e pool, com timeout final e proteção contra execução dupla. `gracefulShutdownService.js:1-40`; `server.js:138-149`. | `gracefulShutdownService.test.js` cobre ordem, conclusão e idempotência. |
| AUD-016 | **Parcialmente corrigido** | Foi feita refatoração incremental dos trechos de maior risco: tokens, rate limit, política de senha, proxy, upload e encerramento foram extraídos para módulos próprios. Os grandes controllers/telas remanescentes não foram divididos em uma única alteração para evitar regressão funcional. Novos módulos: `PasswordTokenModel.js`, `UploadClaimModel.js`, `rateLimitStore.js`, `passwordPolicy.js`, `trustProxy.js`, `gracefulShutdownService.js`. | Cobertura completa do backend e testes Flutter passaram após as extrações. Próximas divisões devem ser feitas por caso de uso, uma por PR. |
| AUD-017 | **Parcialmente corrigido** | Render passou a usar `npm ci`; lockfiles foram preservados; dependências Flutter compatíveis foram atualizadas em lote (incluindo Dio, image picker e Intl, mais transitivas) e validadas. Versões principais de Firebase, notificações, Riverpod e geolocalização não foram forçadas sem revisão de breaking changes. `render.yaml`; `package.json`; `pubspec.lock` e registradores gerados. | `npm audit` sem vulnerabilidades; análise, 73 testes Flutter e APK passaram após o upgrade. As majors ficam para lotes separados com teste de FCM e dispositivo físico. |

## Migration criada

`ca_backend/migrations/023_security_remediation.sql`

A migration:

- cria `recovery_tokens`, `rate_limit_buckets` e `upload_claims`;
- adiciona `servicos_solicitados.categoria_id`;
- faz backfill somente quando o profissional tinha exatamente uma categoria,
  evitando inventar categoria para dados ambíguos;
- adiciona os índices de FKs;
- converte as colunas de agendamento/conclusão para `TIMESTAMPTZ` com regra
  explícita para timestamps legados de `America/Sao_Paulo`;
- não apaga registros existentes.

Foi aplicada no banco local de desenvolvimento pelo executor de migrations. O
replay completo também foi executado em banco criado especificamente para o
teste por `scripts/verify-migrations.js`; esse banco foi descartado ao terminar.
Nenhum seed ou E2E destrutivo foi executado.

## Testes e validações finais

| Verificação | Resultado |
| --- | --- |
| Backend Jest completo com cobertura | **62 suítes, 455 testes aprovados, 0 falhas** |
| Cobertura backend | Statements 80,59%; branches 71,64%; funções 95,48%; linhas 82,19% |
| Auditoria Node | **0** vulnerabilidades (0 critical/high/moderate/low) |
| Replay PostgreSQL descartável | **23 migrations**, 20 tabelas, banco descartado com sucesso |
| Flutter analyze | **No issues found** |
| Flutter test | **73 testes aprovados, 0 falhas** |
| Flutter APK debug | Build aprovado: `build/app/outputs/flutter-apk/app-debug.apk` |
| Emulador Android | APK instalado, pacote `com.amauc.conecta` aberto e processo ativo |
| Firebase no emulador | Inicialização sem erro detectado e token FCM obtido |
| Smoke autenticado da API | Login sintético, `/usuarios/me`, 12 categorias e logout aprovados |
| API/PostgreSQL local | Servidor ativo em `127.0.0.1:3000`; banco disponível |
| WebSockets | Testes de handshake, sessão revogada, envio e desconexão aprovados na suíte backend |
| Segredos novos | Scanner das alterações: **0 achados** (a configuração Firebase preexistente do usuário foi preservada) |
| Higiene do diff | `git diff --check`: aprovado |

Comandos principais executados:

```text
npm.cmd test -- --coverage --runInBand
npm.cmd audit --json
npm.cmd run test:migrations
flutter.bat pub upgrade
flutter.bat analyze
flutter.bat test
flutter.bat build apk --debug
adb install -r <apk>
adb shell monkey -p com.amauc.conecta ...
git diff --check
```

## Riscos residuais e ações externas

1. Antes de publicar, gerar e validar um **AAB release assinado**. O trabalho
   atual comprovou o APK debug no emulador, não a assinatura de produção.
2. No Firebase/Google Cloud, confirmar que a chave Android está limitada ao
   pacote `com.amauc.conecta` e aos SHA-1/SHA-256 dos certificados de debug e
   release realmente usados. Como uma chave foi compartilhada durante o
   atendimento, recomenda-se uma última rotação antes da publicação.
3. Validar recebimento de notificação em **dispositivo físico** com o app em
   primeiro plano, segundo plano e encerrado. O emulador obteve token FCM sem
   erro, mas não substitui o teste físico de entrega.
4. Aplicar a migration 023 no ambiente hospedado por um job controlado antes
   de liberar o novo backend. Não executar `db:seed` em produção.
5. Publicar a configuração alterada do Render somente com autorização. Nenhum
   deploy, push, rotação externa ou alteração de serviço remoto foi feito nesta
   correção.
6. Planejar lotes separados para as versões principais restantes e para dividir
   os controllers/telas grandes, sempre repetindo a suíte e o teste Android/FCM.

## Veredito

**Pronto para desenvolvimento e homologação local. Não pronto ainda para
publicação em produção.**

O código não possui P0/P1 aberto, compila e executa no Android. A publicação
deve aguardar o AAB release assinado, a validação física do FCM, a confirmação
das restrições Firebase e a aplicação controlada da migration no ambiente
hospedado.

## Preparação adicional para publicação

Em 29/07/2026 foi feita uma segunda revisão voltada ao release:

- a configuração Android/Firebase local foi comparada sem exibir credenciais;
- a impressão SHA-1 debug já cadastrada foi confirmada e a SHA-256 debug foi
  obtida;
- não existe keystore ou configuração de assinatura release;
- a proteção Gradle foi antecipada para o grafo de tarefas, impedindo que APK
  ou AAB sem assinatura seja deixado no diretório de saída;
- um AAB intermediário não assinado gerado pela trava anterior foi verificado
  e removido;
- builds release passaram a exigir `API_BASE_URL` explícita e HTTPS, evitando
  que um aplicativo publicado tente usar o endereço local do emulador;
- variáveis de Firebase Admin, SMTP e armazenamento foram declaradas como
  valores externos no `render.yaml`, sem incluir seus conteúdos;
- foi confirmado que o plano gratuito do Render não oferece a persistência e
  recuperação necessárias para os uploads e banco de uma produção real;
- foi criado `CHECKLIST_PUBLICACAO.md` com assinatura, Firebase, Render,
  backup, rollback, AUD-016 e AUD-017.

O veredito permanece **não pronto para publicação** até a criação autorizada
da chave release, configuração externa, AAB assinado, teste físico do FCM e
infraestrutura persistente com backup.
