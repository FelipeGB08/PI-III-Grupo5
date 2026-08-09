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
- [ ] Login social Google testado com credenciais de produção.

## 3. Localização e mapa

- [ ] Cadastro permite informar endereço principal.
- [ ] Cadastro permite capturar localização atual.
- [ ] Minha Conta permite atualizar endereço e GPS.
- [ ] Mapa abre usando localização do cliente.
- [ ] Se GPS não existir, mapa usa a cidade AMAUC como fallback.
- [ ] Filtro por raio retorna prestadores próximos.
- [ ] Mapa não quebra no Flutter Web.
- [ ] Mapa exibe atribuição ao OpenStreetMap.
- [ ] Marcadores públicos mostram somente localização aproximada por município.
- [ ] GPS exato do atendimento fica disponível apenas no chamado autenticado.
- [ ] Rota aproximada é calculada e falha de rede mantém a distância em linha reta.

## 4. Prestador

- [ ] Prestador configura agenda.
- [ ] Prestador cria serviços com preço e duração.
- [ ] Prestador edita Currículo Vivo.
- [ ] Portfólio aparece no perfil público.
- [ ] Certificações aparecem no perfil público.
- [ ] Badges aparecem quando os critérios são atingidos.
- [ ] Prestador recebe chamado do cliente.

- [ ] Prestador envia documento de verificacao em imagem e o status fica `pendente`.
- [ ] Documento de verificacao nao abre por `/uploads` nem para usuario sem permissao.
- [ ] Admin revisa documento privado, aprova ou rejeita com motivo.
- [ ] Aprovacao exibe o selo publico de profissional verificado; rejeicao mostra o motivo ao prestador.

- [ ] Cliente e prestador conseguem registrar uma denuncia somente em um chamado do qual participam.
- [ ] Admin filtra denuncias, consulta o contexto do chamado e registra uma resolucao.
- [ ] Ao resolver uma denuncia, o denunciante recebe notificacao no aplicativo.

## 5. Cliente

- [ ] Cliente lista profissionais.
- [ ] Cliente abre perfil público do prestador.
- [ ] Cliente agenda serviço usando item da agenda.
- [ ] Cliente abre chat do chamado.
- [ ] Cliente e prestador trocam mensagens em tempo real com as duas telas abertas.
- [ ] Mensagem enviada durante reconexão aparece uma única vez após o fallback HTTP.
- [ ] Mensagem muda de enviada para lida quando a outra parte abre o chat.
- [ ] Após renovar o access token, o chat reconecta sem reabrir a tela.
- [ ] Falha simultânea do socket e da API preserva o texto e permite tentar novamente.
- [ ] Cliente acompanha status do agendamento.
- [ ] Cliente cancela chamado quando aplicável.
- [ ] Cliente avalia somente após confirmar a conclusão.

## 6. Agendamento

- [ ] Backend usa preço/duração do banco.
- [ ] Backend bloqueia horário passado.
- [ ] Backend bloqueia conflito de horário.
- [ ] Prestador aceita chamado.
- [ ] Prestador propõe remarcação.
- [ ] Cliente aceita remarcação.
- [ ] Prestador envia conclusão com ao menos uma foto de evidência.
- [ ] Chamado fica em `aguardando_confirmacao_cliente`.
- [ ] Cliente revisa a evidência e confirma a conclusão.
- [ ] Sem confirmação, consulta após 72h conclui o chamado automaticamente.
- [ ] Avaliação antes da confirmação é bloqueada.
- [ ] Avaliação duplicada é bloqueada.

## 7. Evidências e arquivos

- [ ] Upload aceita JPG/PNG/WEBP/HEIC.
- [ ] Upload bloqueia arquivo inválido.
- [ ] Upload bloqueia imagem acima do limite.
- [ ] Foto de conclusão aparece nos detalhes do chamado.
- [ ] Avatar/perfil não quebra quando a imagem falha.

## 8. Admin e segurança

- [ ] Admin busca usuarios por nome/e-mail e perfil, pagina a lista e ativa/inativa uma conta que nao foi anonimizada por exclusao.
- [ ] Usuario comum recebe 403 ao tentar consultar usuarios, alterar status de conta ou exportar relatorio administrativo.
- [ ] Admin gera o CSV do relatorio e confere indicadores de avaliacoes, categorias, cancelamentos, verificacoes e denuncias.

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
