# Push notifications (Firebase Cloud Messaging)

Este documento descreve o fluxo implementado no Conecta AMAUC e o roteiro para validá-lo em um dispositivo Android físico. O backend usa o Firebase Admin SDK; o app usa `firebase_messaging` e registra o token FCM na API autenticada.

## Como o fluxo funciona

1. O Flutter inicializa o Firebase, pede permissão para notificações e obtém o token com `FirebaseMessaging.getToken()`.
2. Depois do login, `ca_frontend/lib/app.dart` envia o token e a plataforma para `POST /api/v1/dispositivos/token`. O listener `onTokenRefresh` repete o cadastro quando o Firebase gera outro token.
3. `DispositivoController` associa o token ao usuário autenticado. O `ON CONFLICT (token)` move a associação para o usuário atual e reativa o token, se necessário.
4. Um evento de negócio chama `notificarUsuarioSemBloquear`. O serviço grava a notificação em `notificacoes`, busca os tokens ativos do destinatário e envia um multicast pelo Firebase Admin SDK.
5. Tokens que o FCM informa como inválidos ou não registrados são desativados automaticamente. O resultado fica registrado como `pendente`, `enviada` ou `falha` na tabela `notificacoes`.

O payload `data` sempre inclui `tipo` e `notificacao_id`; IDs e demais valores são convertidos para texto, como o FCM exige.

## Eventos atualmente enviados

| Evento FCM | Ação que dispara | Destinatário |
| --- | --- | --- |
| `novo_chamado` | Cidadão cria uma solicitação | Prestador escolhido |
| `chamado_aceito` | Prestador aceita o chamado | Cidadão contratante |
| `chamado_recusado` | Prestador recusa o chamado | Cidadão contratante |
| `proposta_valor` | Prestador propõe outro valor | Cidadão contratante |
| `proposta_valor_aceita` | Cidadão aceita o valor | Prestador |
| `proposta_valor_recusada` | Cidadão recusa o valor | Prestador |
| `remarcacao_solicitada` | Prestador propõe outro horário | Cidadão contratante |
| `remarcacao_aceita` | Cidadão aceita a remarcação | Prestador |
| `remarcacao_recusada` | Cidadão recusa a remarcação | Prestador |
| `chamado_concluido` | Prestador altera o chamado para `concluido` | Cidadão contratante |
| `chamado_cancelado` | Cidadão cancela a solicitação | Prestador |
| `avaliacao_recebida` | Cidadão avalia um chamado concluído | Prestador avaliado |
| `nova_mensagem_chat` | Uma parte envia mensagem por REST ou Socket.IO | A outra parte do chamado |
| `favorito_novo_horario` | Prestador adiciona novos horários à agenda | Clientes que o favoritaram e mantiveram a preferência ativada |

Os quatro marcos do fluxo principal — aceite, remarcação, conclusão e avaliação — já possuem disparo e destinatário explícitos. Não foi encontrada lacuna de evento nesse fluxo.

O upload em `POST /api/v1/solicitacoes/:id/fotos-conclusao` não envia um aviso separado: ele é uma etapa intermediária. O push `chamado_concluido` é enviado na alteração de status que ocorre depois do upload. Uma tentativa de avaliação duplicada também não gera push porque a operação é bloqueada antes de criar uma nova avaliação.

## Configurar o backend

Use o mesmo projeto Firebase configurado no app. Primeiro aplique as migrations, pois elas criam `dispositivo_tokens` e `notificacoes`:

```bash
cd ca_backend
npm run db:migrate
```

Escolha apenas uma das opções de credencial abaixo.

### Opção A — arquivo de service account

No Firebase Console, abra **Configurações do projeto > Contas de serviço > Gerar nova chave privada**. Salve o JSON fora do repositório e aponte para ele com um caminho absoluto:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\seguro\firebase-service-account.json
```

Em Linux/macOS, use o caminho correspondente. Se o backend estiver em um container, o arquivo precisa ser montado no container e a variável deve conter o caminho interno. O carregamento usa Application Default Credentials, conforme a [documentação do Firebase Admin SDK](https://firebase.google.com/docs/admin/setup).

### Opção B — campos em variáveis de ambiente

```env
FIREBASE_PROJECT_ID=seu-projeto-firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto-firebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Mantenha os `\n` literais na chave; `firebaseAdmin.js` os converte em quebras de linha ao iniciar. Reinicie a API após alterar o `.env`. Nunca copie o JSON, a chave privada ou seus valores para Git, Flutter, `app.env` ou `--dart-define`.

## Configurar o Android Flutter

1. No Firebase Console, registre um app Android com o package name `com.amauc.conecta` no mesmo projeto usado pelo backend.
2. Baixe `google-services.json` e coloque em `ca_frontend/android/app/google-services.json`. O `.gitignore` já exclui esse arquivo.
3. Confirme que `ca_frontend/lib/firebase_options.dart` aponta para esse mesmo projeto. Para gerar ou atualizar a configuração pelo fluxo oficial:

   ```bash
   dart pub global activate flutterfire_cli
   firebase login
   cd ca_frontend
   flutterfire configure --project=SEU_PROJECT_ID --platforms=android
   flutter clean
   flutter pub get
   ```

   O comando e o papel de `firebase_options.dart` estão descritos no [guia oficial do FlutterFire](https://firebase.google.com/docs/flutter/setup).

4. Conecte um Android físico com Google Play Services e depuração USB. Para uma API na rede local, use o IPv4 da máquina, não `localhost`:

   ```bash
   flutter devices
   flutter run -d ID_DO_DEVICE --dart-define=API_BASE_URL=http://IP_DA_MAQUINA:3000
   ```

5. Aceite a permissão de notificações. Ela é obrigatória no Android 13 ou superior; o app já declara `POST_NOTIFICATIONS` e chama `requestPermission()`.

O Firebase recomenda obter o token com `getToken()` e sincronizar cada valor emitido por `onTokenRefresh`; ambos já estão conectados à API no app. Consulte o [guia de cliente FCM para Flutter](https://firebase.google.com/docs/cloud-messaging/flutter/get-started).

## Teste ponta a ponta em dispositivo físico

Use duas contas: um cidadão e um prestador. O ideal é manter a conta que receberá o push no aparelho físico e executar a ação da outra conta em outro aparelho, emulador ou cliente Web. Para cada linha, confirme que somente o destinatário indicado recebe a notificação.

| Passo | Ação | Push esperado no aparelho do destinatário |
| --- | --- | --- |
| 1 | Cidadão cria uma solicitação para o prestador | Prestador recebe `novo_chamado` |
| 2 | Prestador aceita a solicitação | Cidadão recebe `chamado_aceito` |
| 3 | Prestador propõe uma nova data/hora | Cidadão recebe `remarcacao_solicitada` |
| 4a | Cidadão aceita a nova data/hora | Prestador recebe `remarcacao_aceita` |
| 4b | Em outro chamado, cidadão recusa a nova data/hora | Prestador recebe `remarcacao_recusada` |
| 5 | Prestador anexa evidências, se desejado, e conclui | Cidadão recebe `chamado_concluido` |
| 6 | Cidadão envia nota e comentário | Prestador recebe `avaliacao_recebida` |
| 7 | Cidadão favorita um prestador; o prestador adiciona um horário novo | Cidadão recebe `favorito_novo_horario` |

Repita pelo menos um evento com o app em primeiro plano, em segundo plano e fechado. Em primeiro plano, o app mostra uma notificação local no canal `chamados_amauc`; em segundo plano ou fechado, o Android exibe a notificação do FCM. O comportamento por estado do app está detalhado no [guia oficial de recebimento no Flutter](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages).

O aviso de disponibilidade é limitado a uma vez por profissional para cada cliente a cada 6 horas. Em **Minha conta > Novos horários de favoritos**, desligue a preferência e edite a agenda novamente para confirmar que esse evento específico não é enviado; os demais pushes continuam habilitados.

## Evidências e diagnóstico

Depois do login, confirme no log do Flutter as mensagens `[FCM] Token recebido.` e, quando ocorrer rotação, `[FCM] Token atualizado.`. No PostgreSQL, estas consultas ajudam a verificar o caminho sem expor o token completo:

```sql
SELECT id, usuario_id, plataforma, ativo, criado_em, atualizado_em
FROM dispositivo_tokens
ORDER BY atualizado_em DESC;

SELECT id, usuario_id, tipo, status, erro, criado_em, enviada_em
FROM notificacoes
ORDER BY criado_em DESC
LIMIT 30;
```

- Nenhuma linha em `dispositivo_tokens`: confirme login, permissão, URL da API e o projeto em `firebase_options.dart`.
- Notificação permanece `pendente`: o usuário não tinha token ativo no momento do evento.
- Notificação fica `falha`: leia a coluna `erro` e o log `Erro ao enviar Firebase Cloud Messaging`; confirme credenciais, projeto e token.
- Token é desativado: reinstalação, limpeza dos dados do app ou rotação pode invalidá-lo. Abra o app e faça login novamente para cadastrar o token atual.
- O evento chega ao usuário errado: confira `usuario_id` do token e use contas distintas. O cadastro autenticado reassocia um token já existente ao usuário que efetuou o login mais recente.

Os testes automatizados mockam o Firebase e validam payload, destinatários e desativação de token inválido. A entrega real só pode ser homologada com credenciais válidas e um aparelho físico; registre data, contas usadas, estado do app e capturas de tela no checklist de regressão.
