# API — limites de uso

O prefixo canônico da API é `/api/v1`. O prefixo `/api` é um alias legado
temporário, mantido somente para versões já publicadas do aplicativo; novos
clientes e integrações devem usar sempre `/api/v1`.

Os limites abaixo são aplicados em memória pelo backend por usuário autenticado
(ID presente no JWT). Eles existem para reduzir abuso sem limitar o uso normal
do aplicativo. Quando não há usuário autenticado, a chave de contingência é o
IP.

| Ação | Canais | Limite padrão |
| --- | --- | --- |
| Criar solicitação | `POST /api/v1/solicitacoes` e alias legado `POST /api/servicos` | 20 por hora |
| Enviar mensagem | `POST /api/v1/solicitacoes/:id/mensagens` e Socket.IO `chat:send` | 60 por minuto, compartilhado entre os dois canais |
| Upload de imagem | `POST /api/v1/upload` e `POST /api/v1/solicitacoes/:id/fotos-conclusao` | 30 por hora |

No HTTP, o excesso retorna `429` com o formato `{ "erro": "..." }` e os
headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` e
`Retry-After`. No Socket.IO, o acknowledgement e o evento `chat:error` recebem
`{ erro, status: 429, retry_after }`.

Os valores podem ser ajustados pelas variáveis `SOLICITACAO_RATE_LIMIT_*`,
`CHAT_RATE_LIMIT_*` e `UPLOAD_RATE_LIMIT_*` descritas em
[`ca_backend/.env.example`](../ca_backend/.env.example). O Swagger documenta
as respostas `429` em `http://localhost:3000/api/v1/docs` fora de produção.

## Acesso a imagens

As URLs retornadas pelo upload usam o formato relativo
`/uploads/<identificador-aleatorio>.<extensao>`. Fotos públicas de perfil e
portfólio podem ser carregadas sem autenticação. Quando a mesma URL está
vinculada ao campo de foto ou às evidências de conclusão de uma solicitação, o
download exige `Authorization: Bearer <access_token>` e só é permitido ao
cidadão, ao prestador daquele chamado ou a um administrador. Sem sessão a
resposta é `401`; para outro usuário autenticado é `403`. Anexos autorizados
usam `Cache-Control: private, no-store`.
