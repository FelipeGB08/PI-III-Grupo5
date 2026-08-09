# Login social Google em produção

Este guia descreve somente os nomes das configuracoes externas. Nao versione
IDs de cliente, chaves privadas, client secrets ou URLs reais neste repositorio.

O projeto mantém somente o login social Google. Ele termina em
`POST /api/v1/auth/social-login` (com o alias temporário
`/api/auth/social-login`) e o backend valida o token do provedor antes de
criar ou iniciar a sessão.

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

## Checklist antes de liberar

- [ ] O Web Client ID do Google configurado no backend corresponde ao audience
      emitido para cada plataforma.
- [ ] iOS possui o esquema local `REVERSED_CLIENT_ID` do Google e o ID token
      usa como audience o Web Client ID configurado no backend.
- [ ] Nenhuma chave privada ou client secret foi adicionada ao repositorio ou
      ao build Flutter.
- [ ] Token Google com audience incorreto ou e-mail não verificado recebe
      resposta `401` do backend.
