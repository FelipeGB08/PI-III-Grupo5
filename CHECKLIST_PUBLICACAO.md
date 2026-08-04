# Checklist de publicação — Conecta AMAUC

Atualizado em: 29/07/2026  
Pacote Android: `com.amauc.conecta`  
Versão atual: `1.0.0+1`

## Veredito atual

**Não publicar ainda.**

O código, o backend local, o APK debug e o Firebase no emulador estão
funcionando. A publicação permanece bloqueada por assinatura release ausente,
armazenamento/backup de produção, configuração externa do Firebase/Render e
teste físico de notificações.

## Estado das etapas

| Etapa | Estado | Evidência ou pendência |
| --- | --- | --- |
| Correções P0/P1 | Concluída | Testes de regressão permanecem aprovados. |
| Migration 023 local | Concluída | O executor informou que `023_security_remediation.sql` já estava aplicada. |
| Replay das migrations | Concluída | 23 migrations e 20 tabelas em PostgreSQL descartável; banco removido ao final. |
| Backend e PostgreSQL local | Concluída | Status disponível e smoke autenticado aprovado. |
| WebSockets | Concluída localmente | Handshake, envio, revogação e desconexão cobertos pela suíte backend. |
| Firebase Android local | Concluída | Projeto, App ID, chave cliente e pacote coincidem entre os arquivos locais, sem exibir valores. |
| Token FCM no emulador | Concluída | Token obtido sem ser impresso e sem erro de inicialização Firebase. |
| APK debug | Concluída | Compilado, instalado e aberto no emulador. |
| URL da API em release | Protegida | Release agora exige `API_BASE_URL` explícita, válida e HTTPS. |
| Keystore release | **Bloqueada por autorização** | Não existe keystore, `key.properties` nem variável `KEYSTORE_*`. |
| APK release assinado | Pendente | Depende da keystore release e da URL HTTPS definitiva da API. |
| AAB release assinado | Pendente | Depende da keystore release. A trava Gradle foi corrigida para impedir AAB sem assinatura antes da geração. |
| SHA-1/SHA-256 release | Pendente | Só existem depois da criação da chave release. |
| FCM em aparelho físico | Pendente externo | Há somente um emulador conectado. |
| Render produção | Pendente externo | Requer plano/armazenamento/backup adequados e preenchimento de variáveis. |
| Migration 023 em produção | Não executada | Exige backup e autorização explícita. |
| Play Console | Não executada | Nenhum upload ou publicação foi realizado. |

## Artefatos Android

### Disponível

`ca_frontend/build/app/outputs/flutter-apk/app-debug.apk`

- tipo: debug;
- tamanho validado: aproximadamente 238,09 MB;
- instalado e aberto no emulador;
- não deve ser enviado à Play Store.

### Não disponíveis

- `app-release.apk`: não gerado;
- `app-release.aab`: não gerado;
- motivo: assinatura release não configurada.

Um AAB intermediário sem assinatura chegou a ser criado durante a verificação
da trava antiga. Ele foi identificado como não assinado e removido. A proteção
Gradle passou a validar o grafo antes das tarefas de empacotamento, e um novo
teste confirmou que nenhum AAB é deixado quando a assinatura está ausente.

## Certificados Android

### Certificado debug atual

- SHA-1: `0E:52:52:07:9C:45:9F:E4:8E:3B:D9:8B:8A:CE:52:1D:0E:1D:E1:29`
- SHA-256: `27:96:E1:FC:9A:51:9F:FE:86:6D:30:09:54:E4:E0:31:E0:A5:C2:CA:51:FC:0B:89:8E:D9:28:E2:78:30:5A:C4`

As impressões são identificadores públicos do certificado, não senhas.

### Certificado release

Pendente. Para criá-lo será necessário definir localmente:

1. caminho seguro fora do repositório;
2. alias da chave;
3. senha forte do keystore;
4. senha forte da chave;
5. nome/organização/município/estado/país do titular do certificado;
6. local seguro para pelo menos duas cópias de backup.

As senhas devem ser digitadas localmente, nunca enviadas no chat, registradas
em log ou incluídas no Git.

Com autorização explícita, o procedimento será:

```text
keytool -genkeypair -v -keystore <CAMINHO_FORA_DO_REPOSITORIO> \
  -keyalg RSA -keysize 2048 -validity 10000 -alias <ALIAS>
```

Depois, configurar uma destas opções:

- `ca_frontend/android/key.properties`, que já está ignorado pelo Git; ou
- `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` e `KEY_PASSWORD` no
  ambiente seguro de build.

O arquivo real `.jks`, `.keystore` e `key.properties` já está coberto pelas
regras de `.gitignore`.

## Comandos de build release

Somente após configurar a assinatura e a URL definitiva:

```text
flutter build apk --release \
  --dart-define=API_BASE_URL=<ORIGEM_HTTPS_DA_API> \
  --dart-define=GOOGLE_CLIENT_ID=<CLIENT_ID_PUBLICO> \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<CLIENT_ID_PUBLICO>

flutter build appbundle --release \
  --dart-define=API_BASE_URL=<ORIGEM_HTTPS_DA_API> \
  --dart-define=GOOGLE_CLIENT_ID=<CLIENT_ID_PUBLICO> \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<CLIENT_ID_PUBLICO>
```

Antes do upload, validar:

- assinatura e certificado do APK/AAB;
- SHA-1/SHA-256 release no Firebase;
- `versionCode` maior do que toda versão já enviada à Play Store;
- URL da API usando HTTPS;
- login, upload, agendamento, chat e notificações no artefato release.

## Firebase e Google Cloud

Configuração local confirmada:

- pacote `com.amauc.conecta`;
- projeto Firebase esperado;
- `google-services.json` presente apenas localmente e ignorado pelo Git;
- `firebase_options.dart` consistente com o arquivo Android;
- token FCM obtido no emulador sem mostrar seu valor.

Ações manuais restantes:

1. criar a chave release e obter SHA-1/SHA-256;
2. cadastrar ambas as impressões no aplicativo Android do Firebase;
3. confirmar que a chave Android está restrita ao pacote e aos certificados
   realmente usados;
4. realizar a rotação final da chave anteriormente compartilhada;
5. baixar novamente `google-services.json` se o Firebase gerar configuração
   atualizada;
6. testar uma mensagem real em aparelho físico com o aplicativo:
   - aberto;
   - em segundo plano;
   - encerrado;
7. verificar login Google no AAB release instalado pela Play Internal Testing.

Links:

- [Configurações do projeto Firebase](https://console.firebase.google.com/project/conecta-amauc/settings/general/)
- [Credenciais no Google Cloud](https://console.cloud.google.com/apis/credentials?project=conecta-amauc)

## Render e produção

O `render.yaml` local confirma:

- `npm ci`;
- `autoDeployTrigger: off`;
- nenhum seed;
- `TRUST_PROXY_HOPS=1`;
- documentação da API desabilitada;
- health check em `/api/v1/status`;
- migration executada antes do início pelo comando com `&&`, impedindo que o
  servidor inicie se a migration falhar.

Variáveis que precisam ser conferidas no painel, sem copiar seus valores:

### Obrigatórias do núcleo

- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `TRUST_PROXY_HOPS`

### Firebase Admin

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### E-mail transacional

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

### Login social

- `GOOGLE_CLIENT_ID`
- variáveis Apple usadas pelo projeto;
- variáveis GitHub usadas pelo projeto.

### Observabilidade e armazenamento

- `SENTRY_DSN`, se Sentry for utilizado;
- `UPLOADS_DIR`;
- `VERIFICATION_DOCUMENTS_DIR`.

### Bloqueadores do plano gratuito

O Blueprint ainda declara plano gratuito. Segundo a documentação oficial:

- banco gratuito não possui backup/PITR e expira;
- o filesystem do serviço web é efêmero;
- uploads e documentos gravados localmente podem desaparecer em
  restart/redeploy;
- `preDeployCommand` para migrations está disponível em serviço web pago.

Portanto, para produção real, escolher uma das opções antes do deploy:

1. serviço e PostgreSQL pagos, com PITR e disco persistente montado para os
   dois diretórios de upload; ou
2. armazenamento de objetos externo, exigindo implementação e testes próprios.

Não alterar plano ou habilitar cobrança sem autorização.

Referências oficiais:

- [Blueprint e preDeployCommand](https://render.com/docs/blueprint-spec)
- [Deploys e pre-deploy](https://render.com/docs/deploys)
- [Limitações do plano gratuito](https://render.com/docs/free)
- [Backups PostgreSQL](https://render.com/docs/postgresql-backups)

## Backup, migration 023 e rollback

### Antes da migration em produção

1. desativar deploy automático — já está desativado no arquivo;
2. escolher janela de manutenção;
3. atualizar o PostgreSQL para plano com PITR ou executar `pg_dump` completo;
4. guardar o backup fora do servidor e validar que ele pode ser lido;
5. registrar contagens das tabelas afetadas;
6. executar replay da migration em uma cópia restaurada;
7. verificar espaço, duração e locks;
8. aplicar `023_security_remediation.sql` pelo executor versionado;
9. confirmar a linha em `schema_migrations`;
10. confirmar tabelas, índices, `categoria_id` e tipos `TIMESTAMPTZ`;
11. executar health check e smoke autenticado;
12. somente então liberar o novo backend.

### Estratégia de rollback

- Se o código novo falhar, voltar para a versão anterior do serviço e manter a
  migration, pois as tabelas/coluna adicionais e `TIMESTAMPTZ` são compatíveis
  com leitura PostgreSQL anterior.
- Não executar uma migration “down” improvisada em dados reais.
- Se a migration alterar dados de forma inesperada, restaurar o backup/PITR em
  uma nova instância, validar isoladamente e só então trocar `DATABASE_URL`.
- Não restaurar um dump sobre um banco que contenha dados novos importantes.
- Preservar logs e horário exato da migration para escolher o ponto de
  recuperação.

## AUD-016 — refatoração incremental

Continua parcialmente corrigido. Maiores arquivos atuais:

1. `providers.dart` — aproximadamente 1.388 linhas;
2. `welcome_auth_screen.dart` — aproximadamente 1.355;
3. `api_service.dart` — aproximadamente 1.073;
4. `minha_conta_screen.dart` — aproximadamente 931;
5. `agendamento_detalhes_screen.dart` — aproximadamente 919;
6. `admin_dashboard_screen.dart` — aproximadamente 831;
7. `agendar_servico_screen.dart` — aproximadamente 831;
8. `SolicitacaoController.js` — aproximadamente 713;
9. `solicitacaoRoutes.js` — aproximadamente 599.

Plano recomendado, uma alteração por vez:

1. dividir `providers.dart` por domínio;
2. extrair os fluxos Google/Apple/GitHub da tela de autenticação;
3. dividir `api_service.dart` por API de domínio;
4. extrair seções de conta e painéis para widgets próprios;
5. separar operações de status, cancelamento, remarcação e conclusão do
   controller de solicitações.

Cada lote deve manter comportamento e passar toda a suíte antes do próximo.

## AUD-017 — dependências

Continua parcialmente corrigido. Lockfiles e `npm ci` estão configurados e as
atualizações compatíveis já foram aplicadas. Majors restantes:

| Lote | Atual | Destino observado | Motivo para separar |
| --- | ---: | ---: | --- |
| Firebase Core | 3.15.2 | 4.12.1 | Mudança principal do conjunto FlutterFire. |
| Firebase Messaging | 15.2.10 | 16.4.3 | Remove APIs antigas e altera SDK nativo. |
| Notificações locais | 18.0.1 | 22.2.0 | APIs passam a usar parâmetros nomeados e exigem SDK recente. |
| Geolocator | 13.0.4 | 14.0.3 | Nova base Android e requisito mínimo de Flutter. |
| Riverpod | 2.6.1 | 3.4.x | Mudanças de ciclo de vida e providers legados. |

Não atualizar esses lotes antes de existir:

- branch/commit limpo para isolamento;
- keystore e AAB release validáveis;
- aparelho físico para FCM/local notifications;
- teste de localização;
- plano de migração específico para Riverpod.

## Validações executadas nesta preparação

- backend: 62 suítes e 455 testes aprovados;
- cobertura: statements 80,59%, branches 71,64%, funções 95,48% e linhas
  82,19%;
- `npm audit`: zero vulnerabilidades;
- replay: 23 migrations em banco descartável;
- Flutter analyze: sem problemas;
- Flutter test: aprovado;
- proteção da URL release: quatro casos aprovados;
- APK debug: compilado e instalado;
- API autenticada: login, perfil, 12 categorias e logout aprovados;
- Firebase: inicialização e token FCM confirmados no emulador;
- scanner de segredos e `git diff --check`: devem ser repetidos imediatamente
  antes de commit/publicação.

## Aprovações ainda necessárias

Solicitar autorização explícita antes de:

- criar a keystore release;
- alterar Firebase/Google Cloud;
- habilitar serviço/plano pago ou disco no Render;
- aplicar migration 023 em produção;
- realizar deploy;
- fazer push;
- enviar AAB à Play Console;
- publicar qualquer versão.

