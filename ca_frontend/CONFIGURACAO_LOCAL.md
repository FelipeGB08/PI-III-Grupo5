# Configuracao local do aplicativo

Nenhuma credencial real deve ser versionada. Os arquivos abaixo sao modelos
para configuracao na maquina de cada integrante.

## Google Sign-In no iOS

1. Copie `ios/Flutter/GoogleAuth.xcconfig.example` para
   `ios/Flutter/GoogleAuth.xcconfig`.
2. No arquivo local, defina `GOOGLE_REVERSED_CLIENT_ID` com o
   `REVERSED_CLIENT_ID` do cliente OAuth do tipo iOS. O arquivo local esta no
   `.gitignore`.
3. Informe o client ID iOS ao Dart por `GOOGLE_CLIENT_ID` e o client ID web
   usado como audience do backend por `GOOGLE_SERVER_CLIENT_ID`, pelo mecanismo
   de ambiente/`--dart-define` ja usado pelo projeto.

O aplicativo recebe somente client IDs publicos. O client secret do Google
nunca deve ser colocado no Flutter.

## Assinatura Android release

Copie `android/key.properties.example` para `android/key.properties`, aponte
para um keystore mantido fora do Git e preencha os valores apenas localmente.
Arquivos `key.properties`, `.jks` e `.keystore` estao ignorados.

Para habilitar Firebase/FCM no Android, coloque o `google-services.json`
fornecido pelo projeto Firebase em `android/app/google-services.json`. Sem esse
arquivo o projeto ainda compila, mas o envio/recebimento de push fica
indisponivel em runtime.

## Mapa e localizacao

O mapa usa OpenStreetMap com rotas OSRM e nao exige chave de API. Android ja
declara as permissoes de localizacao e iOS inclui a descricao exibida ao
solicitar acesso. Em dispositivo fisico, conceda a permissao quando o app pedir.
No Flutter Web, sirva o app por HTTPS fora de `localhost`, pois navegadores
bloqueiam geolocalizacao em origens inseguras.

## URL da API

`API_BASE_URL` deve conter apenas a origem do backend, por exemplo
`https://api.exemplo.test`. O app usa `/api/v1` como prefixo canonico.
