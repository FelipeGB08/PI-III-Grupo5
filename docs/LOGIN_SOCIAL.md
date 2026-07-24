# Login social em producao

Este guia descreve somente os nomes das configuracoes externas. Nao versione
IDs de cliente, chaves privadas, client secrets ou URLs reais neste repositorio.

Google e Apple terminam em `POST /api/v1/auth/social-login` (com o alias
temporario `/api/auth/social-login`). O backend valida o token do provedor
antes de criar ou iniciar a sessao. O GitHub usa as rotas OAuth versionadas
`/api/v1/auth/github/authorize`, `/api/v1/auth/github/callback` e
`/api/v1/auth/github/complete`; os aliases sem `/v1` existem somente durante a
transicao.

## Google

- Backend: `GOOGLE_CLIENT_ID` deve ser o **Web Client ID**. Esse e o unico
  audience aceito pelo backend.
- Flutter Android: `GOOGLE_SERVER_CLIENT_ID` deve conter exatamente o mesmo
  Web Client ID aceito pelo backend. O OAuth Client ID Android continua
  associado ao package e aos fingerprints no arquivo local
  `android/app/google-services.json`.
- Flutter iOS/macOS: `GOOGLE_CLIENT_ID` recebe o Client ID nativo iOS e
  `GOOGLE_SERVER_CLIENT_ID` recebe o Web Client ID aceito pelo backend.
- Flutter Web: `GOOGLE_CLIENT_ID` deve ser o mesmo Web Client ID do backend.
  `GOOGLE_SERVER_CLIENT_ID` pode ficar vazio ou repetir exatamente esse valor.

No iOS, adicione localmente o `REVERSED_CLIENT_ID` fornecido pelo
`GoogleService-Info.plist` em `CFBundleURLSchemes` do Runner. Esse identificador
e um esquema de callback publico, nao um client secret; o repositorio nao
contem um valor real. Sem ele, o navegador nao consegue retornar ao app depois
da autenticacao.

Cadastre os origins do Flutter Web e as assinaturas de release Android no
Google Cloud. O backend rejeita tokens com outro audience ou com e-mail nao
verificado. Nenhum client secret Google e enviado ao aplicativo.

## Apple

O projeto separa os audiences Apple por tipo de fluxo:

- `APPLE_IOS_CLIENT_ID`: Bundle ID do App ID usado pelo login nativo iOS.
- `APPLE_SERVICES_ID`: Services ID usado por Android e Web.
- `APPLE_ANDROID_REDIRECT_URI`: Return URL HTTPS exata do callback Android.
- `APPLE_WEB_REDIRECT_URI`: Return URL HTTPS exata do Flutter Web.

Nao existe fallback para um `APPLE_CLIENT_ID` unico: iOS e Android/Web precisam
dos audiences separados acima. O backend mantem a verificacao de assinatura
pelas chaves publicas Apple e exige o issuer oficial da Apple.

Antes de abrir a autorizacao, toda plataforma chama
`GET /api/v1/auth/apple/config?platform=ios|android|web`. A resposta contem
`client_id`, `platform`, `state`, `nonce` e `expires_in`; `redirect_uri` aparece
somente para Android e Web. O `state` e assinado com HMAC usando o
`JWT_SECRET`, expira em cinco minutos e vincula plataforma e hash do nonce.

O cliente envia esse `state` e `nonce` na autorizacao Apple e, ao concluir,
chama `POST /api/v1/auth/social-login` com `provider: "apple"`,
`platform`, `state`, `nonce` e o identity token em `token`. O backend valida a
assinatura e validade do contexto, seleciona o audience pela plataforma,
verifica assinatura/issuer/audience do identity token e exige que a claim
`nonce` corresponda ao nonce emitido. Valores criados pelo cliente ou
reutilizados em outra plataforma recebem `401`.

### iOS nativo

1. Registre o App ID definitivo no Apple Developer e habilite Sign in with
   Apple.
2. Habilite a capability no target Runner e use um provisioning profile que a
   contenha. O arquivo versionado `Runner.entitlements` ja declara a capability.
3. Preencha `APPLE_IOS_CLIENT_ID` no ambiente do backend com o Bundle ID do
   App ID. O fluxo nativo nao usa redirect URI HTTP, mas tambem deve obter e
   devolver `state`/`nonce` pelo contrato de configuracao descrito acima.

### Android

1. Crie um Services ID associado ao App ID que possui Sign in with Apple.
2. Cadastre o dominio e a Return URL HTTPS correspondente a
   `/api/v1/auth/apple/callback` (o alias `/api/auth/apple/callback` tambem
   existe durante a transicao da API).
3. Preencha `APPLE_SERVICES_ID` e `APPLE_ANDROID_REDIRECT_URI` somente no
   ambiente do backend.

O Android usa a configuracao emitida pelo backend para receber o Services ID,
a Return URL, o `state` e o `nonce`. O callback recebe apenas o `form_post` da
Apple e redireciona para a Activity
`SignInWithAppleCallback` do pacote fixo do app. Ele nunca aceita
`redirect_uri` enviado pelo cliente.

### Web

1. Registre o Services ID e habilite o dominio do Flutter Web no portal Apple.
2. Registre a Return URL HTTPS do proprio aplicativo Flutter Web.
3. Preencha `APPLE_SERVICES_ID` e `APPLE_WEB_REDIRECT_URI` somente no ambiente
   do backend.

O Flutter Web carrega o JavaScript oficial da Apple e usa a configuracao
emitida pelo backend. Antes de iniciar o fluxo, o app exige HTTPS e verifica
que a origem da Return URL e a mesma da pagina atual. Assim, nem a interface
nem um parametro de requisicao podem escolher outro redirect. A pagina Web
recebe o retorno da Apple e entrega o identity token, `state` e `nonce` ao
endpoint social; nao existe callback arbitrario controlado pelo cliente.

Nenhuma variavel Apple precisa ser fornecida por `--dart-define`: o cliente
recebe somente a configuracao publica e controlada disponibilizada pelo backend.
Nao coloque Team ID, Key ID, private key ou client secret no Flutter.

## GitHub

O login GitHub usa OAuth Authorization Code. O app abre a autorizacao no
navegador, o backend recebe o `code`, valida o `state`, troca o codigo por um
access token no servidor e devolve ao app somente um ticket de uso unico para
iniciar a sessao local. Nenhum usuario cola token e o access token do GitHub
nunca chega ao Flutter.

Configure somente no backend:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`: callback HTTPS do backend em
  `/api/v1/auth/github/callback` (o alias `/api/auth/github/callback` tambem
  existe temporariamente).
- `GITHUB_WEB_REDIRECT_URI`: URL HTTPS do arquivo Flutter Web `/auth.html`.

No portal GitHub, registre `GITHUB_REDIRECT_URI` como Authorization callback
URL. O fluxo pede apenas os escopos `read:user` e `user:email`; o backend exige
um e-mail verificado. Android e iOS retornam ao esquema local
`conecta-amauc-auth`; a Web usa `auth.html` para devolver o resultado com
`postMessage`.

O Client Secret permanece no ambiente do backend. Nao ha `--dart-define` nem
secret GitHub no aplicativo Flutter.

## Checklist antes de liberar

- [ ] Audiences Google e Apple configurados no backend correspondem aos tokens
      emitidos para cada plataforma.
- [ ] iOS possui o esquema local `REVERSED_CLIENT_ID` do Google e o ID token
      usa como audience o Web Client ID configurado no backend.
- [ ] iOS possui a capability Sign in with Apple no profile de release.
- [ ] Android possui a Return URL HTTPS e a Activity de callback registrada.
- [ ] Web usa uma Return URL HTTPS no mesmo origin da aplicacao.
- [ ] Login Apple devolve `platform`, `state` e `nonce` emitidos pelo backend;
      state adulterado, expirado ou usado em outra plataforma recebe `401`.
- [ ] Nenhuma chave privada ou client secret foi adicionada ao repositorio ou
      ao build Flutter.
- [ ] Token de audience ou issuer invalido e token Apple sem e-mail recebem
      resposta `401` do backend.
