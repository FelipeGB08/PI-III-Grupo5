# API — limites de uso

Os limites abaixo são aplicados em memória pelo backend por usuário autenticado
(ID presente no JWT). Eles existem para reduzir abuso sem limitar o uso normal do
aplicativo. Quando não há usuário autenticado, a chave de contingência é o IP.

| Ação | Canais | Limite padrão |
| --- | --- | --- |
| Criar solicitação | `POST /api/solicitacoes` e endpoint legado `POST /api/servicos` | 20 por hora |
| Enviar mensagem | `POST /api/solicitacoes/:id/mensagens` e Socket.IO `chat:send` | 60 por minuto, compartilhado entre os dois canais |
| Upload de imagem | `POST /api/upload` e `POST /api/solicitacoes/:id/fotos-conclusao` | 30 por hora |

No HTTP, o excesso retorna `429` com o formato `{ "erro": "..." }` e os
headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` e
`Retry-After`. No Socket.IO, o acknowledgement e o evento `chat:error` recebem
`{ erro, status: 429, retry_after }`.

Os valores podem ser ajustados pelas variáveis `SOLICITACAO_RATE_LIMIT_*`,
`CHAT_RATE_LIMIT_*` e `UPLOAD_RATE_LIMIT_*` descritas em
[`ca_backend/.env.example`](../ca_backend/.env.example). A documentação Swagger
também lista as respostas `429` em `/api/docs` fora de produção.
