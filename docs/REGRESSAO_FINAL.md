# Checklist de Regressão Final

Use este checklist antes de apresentar ou gerar APK.

## 1. Ambiente

- [ ] `ca_backend/.env` existe e não está versionado.
- [ ] `JWT_SECRET` está preenchido com valor forte.
- [ ] PostgreSQL está rodando.
- [ ] `npm run db:migrate` executa sem erro.
- [ ] `npm run db:seed` executa sem erro.
- [ ] `npm run test:e2e` passa.
- [ ] `flutter analyze` passa.
- [ ] `flutter test` passa.

## 2. Cadastro e autenticação

- [ ] Cadastro de cidadão funciona.
- [ ] Cadastro de profissional funciona.
- [ ] Cidade AMAUC é enviada como `cidade_amauc`.
- [ ] Tipo de perfil é enviado como `perfil_tipo`.
- [ ] Dados inválidos não ficam salvos quando o backend retorna erro.
- [ ] Login comum retorna access token de 15 minutos e refresh token.
- [ ] Access token expirado é renovado automaticamente sem interromper o uso do app.
- [ ] Logout limpa a sessão local e revoga o refresh token no backend.
- [ ] Refresh com o token usado no logout retorna 401.
- [ ] Reset/magic link estão documentados quando SMTP não estiver configurado.
- [ ] Login social testado com credenciais de produção nos 3 provedores.

## 3. Localização e mapa

- [ ] Cadastro permite informar endereço principal.
- [ ] Cadastro permite capturar localização atual.
- [ ] Minha Conta permite atualizar endereço e GPS.
- [ ] Mapa abre usando localização do cliente.
- [ ] Se GPS não existir, mapa usa a cidade AMAUC como fallback.
- [ ] Filtro por raio retorna prestadores próximos.
- [ ] Mapa não quebra no Flutter Web.

## 4. Prestador

- [ ] Prestador configura agenda.
- [ ] Prestador cria serviços com preço e duração.
- [ ] Prestador edita Currículo Vivo.
- [ ] Portfólio aparece no perfil público.
- [ ] Certificações aparecem no perfil público.
- [ ] Badges aparecem quando os critérios são atingidos.
- [ ] Prestador recebe chamado do cliente.

## 5. Cliente

- [ ] Cliente lista profissionais.
- [ ] Cliente abre perfil público do prestador.
- [ ] Cliente agenda serviço usando item da agenda.
- [ ] Cliente abre chat do chamado.
- [ ] Cliente acompanha status do agendamento.
- [ ] Cliente cancela chamado quando aplicável.
- [ ] Cliente avalia após conclusão.

## 6. Agendamento

- [ ] Backend usa preço/duração do banco.
- [ ] Backend bloqueia horário passado.
- [ ] Backend bloqueia conflito de horário.
- [ ] Prestador aceita chamado.
- [ ] Prestador propõe remarcação.
- [ ] Cliente aceita remarcação.
- [ ] Prestador conclui chamado.
- [ ] Avaliação duplicada é bloqueada.

## 7. Evidências e arquivos

- [ ] Upload aceita JPG/PNG/WEBP/HEIC.
- [ ] Upload bloqueia arquivo inválido.
- [ ] Upload bloqueia imagem acima do limite.
- [ ] Foto de conclusão aparece nos detalhes do chamado.
- [ ] Avatar/perfil não quebra quando a imagem falha.

## 8. Admin e segurança

- [ ] Admin acessa relatórios.
- [ ] Usuário comum não acessa rota admin.
- [ ] Queries críticas usam parâmetros.
- [ ] Rate limit está ativo em login/cadastro/reset/magic link.
- [ ] `.env`, `uploads/`, `node_modules/` e builds não aparecem no `git status`.

## 9. Apresentação

- [ ] Fluxo foi ensaiado com as contas seed.
- [ ] Pelo menos um teste foi feito em celular físico.
- [ ] GPS foi testado em celular físico.
- [ ] Câmera/galeria foi testada em celular físico.
- [ ] Prints/evidências da homologação foram salvos.
- [ ] README está atualizado.
