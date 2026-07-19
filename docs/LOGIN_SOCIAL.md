# Login social em produção

Este guia descreve a configuração de credenciais oficiais para Google, Apple e GitHub sem alterar a validação existente. Faça primeiro o deploy do backend e substitua os valores abaixo pelas URLs reais:

```text
API_PRODUCAO=https://SEU-SERVICO.onrender.com
APP_WEB=https://SEU-FLUTTER-WEB.exemplo.com
```

Não cadastre literalmente `SEU-SERVICO` ou `SEU-FLUTTER-WEB`. Copie a URL exibida pelo Render depois que o serviço existir. Credenciais e secrets ficam apenas no `.env` local ou no painel do provedor de hospedagem.

## 1. O que o código valida hoje

Todos os provedores terminam em `POST /api/auth/social-login`, com `provider`, `token` e `cidade_amauc`. Essa rota não é um callback OAuth: ela espera JSON contendo um token que o Flutter já obteve.

| Provedor | Token recebido pelo backend | Validação atual | Variável usada na validação | Aquisição atual no Flutter |
| --- | --- | --- | --- | --- |
| Google | ID token JWT | Assinatura pelas chaves públicas do Google, issuer, audience e e-mail verificado | `GOOGLE_CLIENT_ID` | `google_sign_in`, sem colar token |
| Apple | Identity token JWT | Assinatura pelas chaves públicas da Apple, issuer, audience e presença de e-mail | `APPLE_CLIENT_ID` | `sign_in_with_apple` em plataforma compatível |
| GitHub | Access token OAuth | Consulta `GET /user` e `GET /user/emails` na API do GitHub | Nenhuma | Token colado manualmente na tela atual |

Consequências importantes:

- `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` existem no `.env.example`, mas ainda não são consumidos pelo backend ou Flutter.
- O backend Apple aceita um único audience. No iOS nativo, o audience é o Bundle ID; no fluxo Web/Android, é o Services ID. A configuração atual não atende simultaneamente os dois audiences.
- Android/Web com Apple precisam de um endpoint HTTPS de retorno que processe o `form_post` da Apple. Esse endpoint e a Activity de callback Android ainda não existem no projeto.
- No Flutter Web, o plugin Google exige o botão oficial `renderButton`, mas a tela atual chama `authenticate()`, que não é suportado no navegador.
- Portanto, Google em Android/iOS é o único fluxo cuja aquisição oficial pode ser concluída apenas com configuração. Google Web, Apple Android/Web e o OAuth oficial do GitHub ainda exigem implementação adicional. Este documento não mascara essas limitações.

## 2. Google

Referências oficiais: [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) e [configuração do plugin Flutter](https://pub.dev/packages/google_sign_in/versions/7.2.0).

### Criar as credenciais

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) com a conta do grupo e crie ou selecione o projeto do Conecta AMAUC.
2. Em **Google Auth Platform**, configure Branding, Audience e Data Access. Para autenticação básica, solicite somente `openid`, `email` e `profile`.
3. Publique o consentimento para produção e cadastre os usuários de teste enquanto o aplicativo ainda estiver em modo de testes.
4. Crie um OAuth Client do tipo **Web application**. Esse será o client ID de servidor e o audience que o backend aceita.
5. Para Flutter Web, adicione `APP_WEB` em **Authorized JavaScript origins**. O fluxo atual usa ID token no cliente e não possui callback no backend; não cadastre `/api/auth/social-login` como redirect URI.
6. Para Android, crie também um OAuth Client do tipo **Android** com:
   - package name: `com.amauc.conecta`;
   - SHA-1 e SHA-256 do keystore usado para assinar o build de release;
   - o mesmo cadastro para cada assinatura usada, como upload key e Play App Signing, se forem diferentes.
7. Se houver build iOS, primeiro substitua o Bundle ID de exemplo `com.example.caFrontend` por um identificador definitivo. Depois crie o OAuth Client iOS correspondente e configure `GoogleService-Info.plist` e o URL scheme reverso conforme o arquivo fornecido pelo Google.

### Variáveis

No backend, o valor deve ser o OAuth Client ID **Web**, porque ele é usado como audience do ID token:

```env
GOOGLE_CLIENT_ID=000000000000-exemplo.apps.googleusercontent.com
```

No Android, o plugin usa o mesmo Web Client ID como `serverClientId`:

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://SEU-SERVICO.onrender.com \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=000000000000-exemplo.apps.googleusercontent.com
```

Se `google-services.json` estiver corretamente configurado e contiver um OAuth client Web, o plugin Android pode obter essa informação do arquivo. Caso contrário, `GOOGLE_SERVER_CLIENT_ID` é obrigatório.

Para Web, a credencial pública que deverá ser usada é o Web Client ID:

```bash
flutter build web --release \
  --dart-define=API_BASE_URL=https://SEU-SERVICO.onrender.com \
  --dart-define=GOOGLE_CLIENT_ID=000000000000-exemplo.apps.googleusercontent.com \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=000000000000-exemplo.apps.googleusercontent.com
```

Esse build configura o identificador, mas o botão atual ainda não conclui o login no navegador: `google_sign_in_web` não permite chamar `authenticate()` a partir de UI customizada. Antes de liberar Google Web, a tela precisa renderizar o botão oficial do plugin e consumir `authenticationEvents`.

No iOS, `GOOGLE_CLIENT_ID` é o client ID iOS e `GOOGLE_SERVER_CLIENT_ID` continua sendo o Web Client ID. O backend sempre recebe somente o ID token e exige que o `aud` seja igual ao `GOOGLE_CLIENT_ID` configurado no servidor.

## 3. Apple

Referências oficiais: [configuração do ambiente Apple](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple), [Services ID e Return URLs](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web) e [integração do plugin Flutter](https://pub.dev/packages/sign_in_with_apple).

### iOS nativo

1. É necessária uma conta ativa no Apple Developer Program.
2. Defina o Bundle ID definitivo do app. O projeto ainda contém `com.example.caFrontend`, que não deve ser usado em produção.
3. Em **Certificates, Identifiers & Profiles > Identifiers**, registre um App ID explícito com esse Bundle ID.
4. Habilite **Sign in with Apple** no App ID e também em **Signing & Capabilities** no target Runner do Xcode. Regenere os provisioning profiles se necessário.
5. Para o fluxo nativo não existe URL de callback HTTP. O identity token retorna diretamente ao aplicativo.
6. Configure no backend o Bundle ID exato, pois ele será o `aud` do token:

   ```env
   APPLE_CLIENT_ID=com.suaorganizacao.conectaamauc
   ```

No iOS nativo, `APPLE_REDIRECT_URI` não é usado pelo código atual.

### Apple em Android ou Web

1. No portal Apple, registre um **Services ID** e associe-o ao App ID primário que possui Sign in with Apple.
2. Cadastre o domínio público sem protocolo em **Domains and Subdomains**.
3. Cadastre uma Return URL HTTPS completa. O endereço reservado para uma futura integração no backend seria:

   ```text
   https://SEU-SERVICO.onrender.com/api/auth/apple/callback
   ```

4. A Return URL e o `APPLE_REDIRECT_URI` precisam ser idênticos. Apple não aceita IP, `localhost` ou HTTP nesse fluxo.
5. Use o Services ID como client ID no backend e no Flutter:

   ```env
   # Backend
   APPLE_CLIENT_ID=com.suaorganizacao.conectaamauc.service
   ```

   ```bash
   flutter build apk --release \
     --dart-define=API_BASE_URL=https://SEU-SERVICO.onrender.com \
     --dart-define=APPLE_CLIENT_ID=com.suaorganizacao.conectaamauc.service \
     --dart-define=APPLE_REDIRECT_URI=https://SEU-SERVICO.onrender.com/api/auth/apple/callback
   ```

Estado atual: `/api/auth/apple/callback` não existe e o `AndroidManifest.xml` não registra `SignInWithAppleCallback`. Assim, reservar essa Return URL no portal não torna o login Android/Web funcional. Para concluir esse fluxo futuramente será necessário receber o retorno da Apple, redirecionar de forma segura para o app e validar o código/estado. Isso também exigirá Team ID, Key ID e chave privada Apple, variáveis que o backend atual ainda não define.

Se iOS nativo e Android/Web precisarem funcionar ao mesmo tempo, o backend terá de aceitar os dois audiences Apple de forma explícita. Não tente resolver isso trocando `APPLE_CLIENT_ID` em tempo de execução ou aceitando qualquer audience.

## 4. GitHub

Referências oficiais: [criação de OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) e [authorization code flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

### Criar as credenciais

1. Na organização ou conta do grupo, abra **Settings > Developer settings > OAuth Apps > New OAuth App**.
2. Use o nome `Conecta AMAUC` e `APP_WEB` como Homepage URL. Se não houver Flutter Web publicado, use a página pública oficial do projeto.
3. Cadastre uma única Authorization callback URL:

   ```text
   https://SEU-SERVICO.onrender.com/api/auth/github/callback
   ```

4. Registre o aplicativo, copie o Client ID e gere um Client Secret. O secret pertence somente ao backend.
5. No fluxo de autorização, solicite no mínimo `read:user user:email`, pois a validação atual consulta `/user/emails` para localizar um e-mail verificado.

Prepare o ambiente do backend:

```env
GITHUB_CLIENT_ID=Iv1_SUBSTITUA_PELO_CLIENT_ID
GITHUB_CLIENT_SECRET=SUBSTITUA_PELO_SECRET
```

Não existe `--dart-define` de GitHub no Flutter atual e o Client Secret nunca deve entrar no aplicativo.

Estado atual: a tela pede que o usuário cole um access token, `/api/auth/github/callback` não existe e as duas variáveis acima não são lidas pela lógica de autenticação. Para transformar o botão em OAuth oficial ainda será necessário:

1. abrir `https://github.com/login/oauth/authorize` com Client ID, callback, `state` e PKCE;
2. receber e validar `code` e `state` no callback;
3. trocar o código por access token no backend usando o Client Secret;
4. entregar o access token à validação já existente, que consulta a API do GitHub;
5. remover da interface a entrada manual de token.

As credenciais podem ser criadas agora, mas o login oficial GitHub não deve ser marcado como concluído até esse fluxo existir e ser testado.

## 5. Configuração no Render

No serviço `conecta-amauc-api`, abra **Environment** e configure, sem versionar valores reais:

```env
GOOGLE_CLIENT_ID=CLIENT_ID_WEB_DO_GOOGLE
APPLE_CLIENT_ID=BUNDLE_ID_IOS_OU_SERVICES_ID
GITHUB_CLIENT_ID=CLIENT_ID_DO_OAUTH_APP
GITHUB_CLIENT_SECRET=SECRET_DO_OAUTH_APP
```

Depois de salvar, faça novo deploy e confira os logs de boot. Em `NODE_ENV=production`, o servidor registra `[AUTH_SOCIAL][PROVEDOR][AVISO]` para variáveis ausentes ou ainda iguais aos placeholders de `.env.example`. O aviso não encerra o servidor.

Para Flutter Web, inclua `APP_WEB` em `ALLOWED_ORIGINS` no backend. Os valores públicos dos client IDs podem ser passados por `--dart-define`; secrets nunca podem.

## 6. Validação antes de liberar

- [ ] A URL pública real da API substituiu todos os placeholders nos portais.
- [ ] OAuth consent screen Google publicado e release SHA cadastrada.
- [ ] O ID token Google possui `aud` igual ao `GOOGLE_CLIENT_ID` do backend.
- [ ] App ID Apple, entitlement e provisioning profile de produção configurados.
- [ ] O audience Apple escolhido corresponde à plataforma que está sendo testada.
- [ ] OAuth App GitHub criado e callback reservado, sem secret no Flutter.
- [ ] Login novo cria usuário apenas após escolher uma cidade AMAUC válida.
- [ ] Login de usuário já existente retorna access token e refresh token.
- [ ] Token adulterado, expirado ou de outro audience recebe 401.
- [ ] Os três provedores foram testados em build de release, não apenas debug.
- [ ] As limitações Apple Android/Web e GitHub foram resolvidas antes de marcar o login oficial como pronto.
