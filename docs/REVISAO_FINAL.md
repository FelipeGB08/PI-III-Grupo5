# Revisão final das tarefas 1 a 16

Data da revisão: 23 de julho de 2026.

## Resultado executivo

As alterações versionáveis das tarefas 1 a 16 foram revisadas em conjunto e
validadas com testes unitários, testes de integração com PostgreSQL real,
análise estática do Flutter e testes de widgets/unidades do aplicativo.

- Backend: 43 suítes e 337 testes aprovados.
- Cobertura do backend: 80,97% de statements, 72,15% de branches, 97,78% de
  functions e 82,53% de lines.
- E2E: fluxo completo aprovado contra PostgreSQL local real.
- Flutter: `flutter analyze` sem erros ou avisos e 49 testes aprovados.
- Segurança de dependências Node: nenhuma vulnerabilidade alta ou crítica.
- Resíduos E2E após a execução final: zero usuários, solicitações ou arquivos
  com os marcadores exclusivos do teste.

Nenhuma credencial real, conta externa, painel de provedor, commit ou push fez
parte desta revisão.

## Evidências executadas

| Comando ou verificação | Resultado |
| --- | --- |
| `npm install` | Dependências já consistentes com o `package-lock.json`. |
| `npm test -- --runInBand` | 43 suítes, 337 testes, todos aprovados; nenhum teste pulado. |
| `npm run db:migrate` | Migrations 001 a 015 reconhecidas e aplicadas; banco acessível. |
| `npm start` + chamadas HTTP | `/api/v1/status` e `/api/status` responderam 200; Swagger respondeu 200 em desenvolvimento. |
| `npm run test:e2e` | Fluxo completo aprovado, incluindo HTTP e Socket.IO. |
| Consulta de resíduos após E2E | 0 usuários E2E, 0 solicitações E2E e 0 arquivos E2E. |
| `npm audit` | 0 critical, 0 high, 8 moderate, 0 low. |
| `npm ls firebase-admin autocannon --depth=0` | `firebase-admin@14.2.0` e `autocannon@8.0.0`. |
| `npm outdated --depth=0` | Nenhuma dependência direta Node desatualizada reportada. |
| Verificação de sintaxe com `node --check` | Todos os arquivos em `src/` e `scripts/` aprovados. |
| `flutter analyze` | `No issues found`. |
| `flutter test --reporter expanded` | 49 testes aprovados; nenhum teste pulado. |
| `flutter pub outdated` | 25 versões atualizáveis presas pelo lock e 15 dependências limitadas por constraints; nenhuma foi alterada sem revisão de breaking changes. |
| `flutter build apk --release --no-pub` | Código e plugins compilados; empacotamento bloqueado intencionalmente pela ausência da chave externa de release. |
| `git diff --check` | Nenhum erro de whitespace. |

O PostgreSQL local foi usado porque ele estava disponível e permitiu validar
o E2E real sem depender de infraestrutura ou credenciais externas.

## Confirmação por tarefa

### 1. Bloqueio de administrador em cadastro público — confirmado

As rotas `/api/v1/auth/registro`, `/api/v1/usuarios/registro` e seus aliases
legados reutilizam o mesmo schema, bloqueio de perfil e rate limit. Os testes
unitários e o E2E tentam cadastrar `perfil_tipo=admin` e confirmam a rejeição
sem criação do usuário. Cadastro normal de cidadão e profissional permanece
funcional.

### 2. Proteção de rotas e dados pessoais — confirmado

As rotas foram inventariadas em `docs/ROUTE_ACCESS.md`. Ações sensíveis exigem
JWT e, quando aplicável, o papel correspondente. A representação pública de
profissional usa uma lista explícita de campos de descoberta e os testes
garantem ausência de e-mail, telefone, senha, hashes e tokens. O E2E repetiu
essa verificação contra resposta real.

Durante a revisão, anexos de solicitações também passaram a exigir que o
solicitante autenticado seja participante do chamado ou administrador. Fotos
de perfil e arquivos públicos não vinculados a solicitações preservam o
comportamento público esperado.

### 3. Zod, aliases legados e erros 400 — confirmado

Login e cadastro legados reutilizam os middlewares das rotas v1. Avaliações,
valores decimais, IDs numéricos e paginação são validados antes do PostgreSQL.
JSON malformado retorna 400 no formato `{ erro: '...' }`. Testes de rota
confirmam e-mail inválido, avaliação inválida, IDs inválidos, JSON inválido e
equivalência dos aliases.

### 4. Rate limit compartilhado entre `/api` e `/api/v1` — confirmado

A chave lógica normaliza o prefixo da API. Rotas autenticadas usam o ID da
sessão/usuário e rotas públicas usam IP, sem separar o contador por alias.
Autenticação, cadastro, refresh, solicitação, chat e upload mantêm limites
próprios, resposta 429 clara e `Retry-After`. Testes alternam os dois prefixos
e comprovam que o contador não reinicia.

### 5. Sessões revogáveis e Socket.IO — confirmado

O access token referencia uma sessão persistida na tabela de refresh tokens.
O middleware HTTP e cada evento autenticado do Socket.IO revalidam usuário
ativo e sessão não revogada no PostgreSQL, sem blacklist em memória. Logout
revoga a sessão atual; exclusão de conta revoga todas as sessões.

O E2E abriu sockets reais, executou logout e exclusão, confirmou o evento de
revogação, a desconexão e a impossibilidade de enviar nova mensagem ou usar o
access token anterior.

### 6. Upload seguro e limpeza — confirmado

Uploads são recebidos em memória, limitados por tamanho e quantidade, recebem
nome aleatório no servidor e só são persistidos após autenticação,
autorização e validação estrutural do binário. JPEG, PNG e WebP possuem
verificações específicas; mimetype e extensão informados pelo cliente não são
considerados prova do formato.

Testes cobrem texto disfarçado de JPEG, extensão ambígua/maliciosa, usuário não
autorizado, falha posterior e remoção do arquivo. As URLs retornadas usam o
prefixo canônico `/uploads/<nome-gerado>`.

### 7. Boot e healthcheck de produção — confirmado

Em produção, o processo encerra antes do boot quando `JWT_SECRET` está vazio,
curto, repetitivo ou parece placeholder. Banco e CORS também são validados.
`DATABASE_URL` deve ser PostgreSQL com host e banco; as variáveis `DB_*` são a
alternativa documentada.

Os healthchecks v1 e legado executam consulta real no pool, possuem timeout e
retornam status não saudável quando o PostgreSQL falha. O teste manual contra
o banco local respondeu 200 nos dois prefixos.

### 8. Storage seguro e ciclo de autenticação Flutter — confirmado

Access e refresh tokens ficam no armazenamento seguro do sistema. Valores
legados são migrados e removidos de `SharedPreferences`. Requisições 401
concorrentes compartilham uma única renovação. O boot valida a sessão antes de
considerar o usuário autenticado.

Logout e exclusão limpam tokens, estado e socket mesmo quando a etapa remota
falha, sem apresentar sessão local ativa. Há testes específicos para storage,
migração, concorrência, erro de logout, exclusão e sessão expirada.

### 9. Android release sem chave de debug — confirmado no escopo versionável

Cleartext é permitido apenas pelo manifest de debug; o manifest principal não
habilita HTTP em texto puro. A configuração release lê uma chave externa via
`key.properties` e recusa gerar release sem ela, em vez de usar silenciosamente
a chave debug. O repositório contém apenas um arquivo de exemplo e ignora
keystores/valores locais.

O build chegou ao empacotamento release e parou na proteção esperada por não
haver keystore real, que está expressamente fora do escopo. O mapa usa
OpenStreetMap/OSRM e não requer chave de mapa no aplicativo.

### 10. Login Google consistente — confirmado no escopo sem credenciais

O Flutter diferencia o client ID nativo do iOS e o Web/Server Client ID usado
como audience. Android usa o Web/Server Client ID; web rejeita IDs
inconsistentes. Ausência de configuração produz mensagem acionável.

O backend mantém validação criptográfica, exige audience permitido e e-mail
verificado. Testes cobrem configuração por plataforma, audience incorreto,
token inválido e e-mail não verificado. Nenhum client secret é enviado ao app.

### 11 e 12. Login Apple e GitHub — removidos antes do fechamento

Apple e GitHub chegaram a ser avaliados na revisão histórica de 23 de julho,
mas foram removidos do produto antes da entrega. O contrato atual aceita
somente login social Google, conforme `docs/LOGIN_SOCIAL.md`, Swagger e os
testes de configuração social.

### 13. Vulnerabilidades transitivas do Firebase Admin — confirmado

`firebase-admin` está na versão direta mais recente disponível
(`14.2.0`). A auditoria final tem zero vulnerabilidades altas ou críticas. As
oito moderadas restantes estão descritas em `SECURITY.md`, incluindo cadeia,
impacto e justificativa.

O `npm audit` oferece regressões incompatíveis para
`firebase-admin@10.3.0` e `autocannon@2.0.1`; nenhuma correção forçada foi
aplicada. A inicialização Firebase e o envio de notificação permanecem cobertos
por testes.

### 14. Swagger, documentação e rotas reais — confirmado

O Swagger usa `/api/v1` como servidor principal e mantém `/api` documentado
como alias legado. Um teste extrai as operações dos routers Express e exige
igualdade exata com a especificação, além de validar referências locais e
respostas 429.

Em produção, a documentação fica fechada por padrão e só é aberta com
`ENABLE_API_DOCS=true`. Em desenvolvimento, `/api/docs` respondeu 200.
README, documentação social e exemplos usam o prefixo canônico.

### 15. Cobertura honesta e limpeza E2E — confirmado

Jest coleta todos os controllers e services críticos, com threshold mínimo de
50% por grupo e 70% específico para o validador de agendamento. A execução
final ficou acima dos limites; `SolicitacaoController.js` alcançou 91,35% de
statements e 94,57% de branches, e `agendamentoValidator.js` alcançou 97,29%
de statements e 90,47% de branches.

O E2E possui setup e teardown seguros, recusa API ou banco remotos, registra
usuários/uploads criados e remove os dados em `finally`. A revisão também
incluiu limpeza estrita de resíduos históricos com marcadores exclusivos de
teste. Após a execução final, as consultas confirmaram zero resíduos.

### 16. Acessibilidade Flutter — confirmado

Login, cadastro, busca, agendamento, chat, perfil e configurações receberam
labels/hints semânticos nos controles principais. A paleta de alto contraste
é aplicada globalmente e a preferência é persistida entre inicializações.

Testes de widgets inspecionam Semantics e persistência/contraste. Código morto,
cache de sessão obsoleto e constantes não usadas encontrados na auditoria
foram removidos. `flutter analyze` terminou sem avisos.

## Lacunas corrigidas durante esta revisão

- O threshold expandido revelou branches não testados no
  `ContaController`; foram adicionados cenários de arquivo ausente, falha de
  remoção e erro de banco.
- O E2E passou a testar revogação real de Socket.IO tanto no logout quanto na
  exclusão da conta.
- O E2E passou a limpar resíduos anteriores usando marcadores estritos e a
  provar que não deixou usuários, solicitações ou arquivos.
- Anexos de solicitação passaram a respeitar autorização dos participantes e
  cache privado.
- IDs numéricos inválidos, JSON malformado, aliases de cadastro/login e campos
  públicos de profissional passaram a ter regressões automatizadas.
- A fixture PNG do E2E foi corrigida para ser uma imagem estruturalmente
  válida sob a validação binária nova.
- A configuração de login social foi reduzida ao Google e alinhada entre
  backend, Flutter, Swagger e documentação.
- A dependência do callback OAuth no Flutter foi atualizada para uma versão
  compatível com o toolchain Android atual.
- CI, README e exemplos de ambiente foram alinhados aos nomes de variáveis
  realmente lidos pelo código.

## Dependências desatualizadas e limites externos

`flutter pub outdated` aponta versões maiores resolvíveis para Firebase,
Riverpod, notificações e geolocalização. Elas não foram atualizadas nesta
revisão porque são mudanças de major version fora do escopo e exigem migração
própria; o estado atual passa em análise e testes.

As seguintes validações dependem de configuração externa e permanecem para o
passo operacional do grupo:

- gerar e guardar um keystore Android real;
- cadastrar e preencher credenciais reais do Google;
- configurar Firebase, SMTP, Sentry e variáveis no Render;
- executar os fluxos sociais/push em dispositivos físicos;
- gerar o APK/AAB assinado e publicar o backend.

O repositório está preparado para receber essas configurações sem conter
segredos reais.
