# Protocolo de Homologação Prática - Conecta AMAUC

## 1. Objetivo

Validar o funcionamento real do aplicativo em ambiente próximo ao uso final: backend local, banco PostgreSQL, app Flutter em emulador e, obrigatoriamente, testes em smartphones físicos com GPS, câmera/galeria e rede local.

## 2. Ambiente local para teste ponta a ponta

### Backend e banco

```bash
cd ca_backend
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Em outro terminal:

```bash
cd ca_backend
npm run test:e2e
```

O E2E cobre o fluxo principal:

- criação de cidadão e profissional;
- login e JWT;
- Currículo Vivo;
- configuração de agenda;
- agendamento;
- chat;
- busca por raio no mapa;
- bloqueios de permissão e horário;
- aceite;
- remarcação;
- conclusão com evidência;
- avaliação;
- bloqueio de avaliação duplicada.

### Flutter em emulador

```bash
cd ca_frontend
flutter pub get
flutter run
```

### Flutter em dispositivo físico

Descubra o IP da máquina que está rodando o backend e execute:

```bash
cd ca_frontend
flutter run --dart-define=API_BASE_URL=http://IP_DA_MAQUINA:3000
```

O smartphone e o computador precisam estar na mesma rede.

## 3. Checklist técnico durante o teste

- Cadastro cria usuário sem salvar dados inválidos.
- Login retorna token JWT.
- Cidade enviada no cadastro pertence à AMAUC.
- Endereço principal pode ser informado.
- GPS solicita permissão e salva latitude/longitude.
- Mapa abre sem erro e usa a localização do cliente.
- Busca de profissionais renderiza sem travar a UI.
- Prestador configura agenda com serviço, preço, duração e horários.
- Cliente agenda usando serviço da agenda do prestador.
- Solicitação aparece para o profissional.
- Chat abre para cliente e prestador.
- Prestador aceita, remarca e conclui chamado.
- Prestador anexa foto de evidência ao concluir.
- Cliente avalia serviço concluído.
- Cancelamento registra política e status de reembolso.
- Currículo Vivo salva biografia, experiência, portfólio e certificações.
- Admin visualiza relatórios e gerencia categorias.

## 4. Amostragem obrigatória

Base controlada: 10 usuários reais da região AMAUC.

### Grupo A - 5 cidadãos locais

Foco:

- cadastro e login;
- endereço e localização;
- busca por cidade/categoria/mapa;
- visualização de Currículo Vivo;
- solicitação de orçamento/agendamento;
- chat;
- avaliação após conclusão.

Perguntas de validação:

- Encontrou a categoria desejada?
- Entendeu o status do chamado?
- O mapa ajudou a localizar prestadores próximos?
- A tela ficou legível em ambiente externo?
- O fluxo parece confiável para contratar alguém?

### Grupo B - 5 profissionais autônomos

Foco:

- cadastro como profissional;
- criação/edição do Currículo Vivo;
- configuração de agenda;
- recebimento de chamados;
- chat;
- aceite, remarcação e conclusão;
- envio de evidência por foto;
- visualização do próprio perfil.

Perguntas de validação:

- O Currículo Vivo representa bem seu trabalho?
- Os campos são claros?
- A configuração de agenda é compreensível?
- A gestão dos chamados é fácil?
- O app transmite confiança profissional?

## 5. Registro de evidências

Para cada participante, registrar:

- perfil: cidadão ou profissional;
- cidade AMAUC;
- modelo do aparelho;
- Android/iOS e versão;
- fluxo testado;
- resultado: aprovado, aprovado com ressalva ou falhou;
- observações objetivas;
- print ou foto da tela final quando aplicável.

## 6. Critério de aceite da homologação

O APK está aprovado para apresentação se:

- pelo menos 8 de 10 usuários concluem o fluxo principal sem ajuda técnica;
- nenhuma falha bloqueia cadastro, login, busca, agendamento, aceite, conclusão ou avaliação;
- GPS funciona em pelo menos 2 aparelhos físicos;
- câmera/galeria funciona em pelo menos 2 aparelhos físicos;
- todos os problemas encontrados estão registrados com prioridade.
