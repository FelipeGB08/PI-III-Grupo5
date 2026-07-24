# Auditoria de acesso às rotas

As rotas abaixo existem tanto em `/api/v1` (prefixo principal) quanto em `/api` (alias temporário), salvo a documentação Swagger. `Auth` significa JWT válido; papéis exigidos aparecem entre parênteses.

## Públicas

- `GET /status`
- `POST /auth/register`, `POST /auth/registro`, `POST /usuarios/registro`
- `POST /auth/login`, `POST /usuarios/login`, `POST /auth/social-login`
- `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/magic-link`, `POST /auth/magic-link/verify`
- `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`
- `GET /profissionais`, `GET /profissionais/:id`
- `GET /agenda/profissionais/:id`
- `GET /avaliacoes/profissional/:id`
- `GET /categorias`

As respostas públicas de profissionais são limitadas a dados de descoberta: identificação, nome, foto, cidade, biografia, categorias, reputação e indicadores profissionais. E-mail, telefone, senha, hashes e tokens não são retornados.

## Autenticadas

- `GET|PATCH /usuarios/me`, `GET /usuarios/perfil`
- `GET /perfil/busca`, `DELETE /perfil/conta`
- `GET /solicitacoes/financeiro`, `GET /solicitacoes/conversas`
- `GET /solicitacoes/:id`, `GET|POST /solicitacoes/:id/mensagens`
- `GET /favoritos`, `GET /favoritos/ids`, `POST|DELETE /favoritos/:profissionalId`
- `GET /notificacoes`, `PATCH /notificacoes/lidas`, `PATCH /notificacoes/:id/lida`
- `POST|DELETE /dispositivos/token`
- `POST /upload`

As ações acima são vinculadas ao usuário autenticado no controller/model; não permitem acessar registros de outro participante.

## Autenticadas por papel

- Profissional: `GET|PUT /agenda/me`, `POST|PATCH /perfil`, `GET /perfil/meu-perfil`
- Cidadão: `POST /servicos`, `POST /solicitacoes`, `GET /solicitacoes/meus-pedidos`, `POST /avaliacoes`
- Profissional: `PUT /servicos/:id/status`, `GET /solicitacoes/minhas-solicitacoes`, `POST /solicitacoes/:id/fotos-conclusao`, `PATCH /solicitacoes/:id/status`, `PATCH /solicitacoes/:id/proposta-valor`, `PATCH /solicitacoes/:id/remarcar`
- Cidadão: `PATCH /solicitacoes/:id/proposta-valor/aceitar`, `PATCH /solicitacoes/:id/proposta-valor/recusar`, `PATCH /solicitacoes/:id/cancelar`, `PATCH /solicitacoes/:id/remarcacao/aceitar`, `PATCH /solicitacoes/:id/remarcacao/recusar`
- Administrador: `POST|PUT|DELETE /categorias/admin`, `POST|PUT|DELETE /admin/categorias`, `GET /admin/relatorios`
