# Roteiro de Apresentação Final

## Objetivo da demonstração

Mostrar que o Conecta AMAUC resolve o fluxo completo de contratação regional:

prestador configura agenda -> cliente encontra profissional -> cliente agenda -> prestador atende -> cliente avalia.

## Antes de começar

Deixe rodando:

```bash
cd ca_backend
npm run db:migrate
npm run db:seed
npm run dev
```

Em outro terminal:

```bash
cd ca_frontend
flutter run
```

Tenha abertas as contas:

- cliente: `ana.contratante@amauc.com`
- prestador: `joao.hidraulica@amauc.com`
- admin: `admin@amauc.com`

Senha:

```text
sim123456
```

## Ordem recomendada

### 1. Contexto do problema

Explique em 30 segundos:

- região AMAUC;
- dificuldade de encontrar profissionais locais;
- necessidade de agenda, confiança e avaliação.

### 2. Login e perfil do cliente

Mostre:

- login;
- endereço principal;
- captura de localização;
- uso da localização no mapa.

Mensagem-chave:

> O app usa cidade AMAUC como fallback, mas também permite ponto exato via GPS.

### 3. Busca e mapa

Mostre:

- tela Explorar;
- filtro por categoria;
- mapa de prestadores;
- raio de busca;
- abertura do perfil público.

Mensagem-chave:

> A busca não depende só de texto; o cliente pode encontrar profissionais próximos.

### 4. Perfil público do prestador

Mostre:

- Currículo Vivo;
- portfólio;
- certificações;
- avaliações;
- badges.

Mensagem-chave:

> O perfil público aumenta confiança antes da contratação.

### 5. Agenda do prestador

Troque para a conta do prestador e mostre:

- configuração de serviços;
- preço;
- duração;
- horários disponíveis.

Mensagem-chave:

> O backend usa preço e duração vindos da agenda, não confia no valor enviado pelo app.

### 6. Agendamento pelo cliente

Volte para o cliente e mostre:

- seleção de serviço;
- data e horário;
- endereço;
- observação;
- envio do agendamento.

Mensagem-chave:

> O sistema bloqueia horário passado e conflito para o mesmo prestador.

### 7. Chat e gestão do chamado

Mostre:

- chat entre cliente e prestador;
- prestador recebendo o chamado;
- aceite;
- remarcação, se quiser demonstrar;
- conclusão.

Mensagem-chave:

> O fluxo cobre comunicação e acompanhamento do serviço.

### 8. Evidência e avaliação

Mostre:

- upload de foto ao concluir;
- detalhes do chamado;
- avaliação pelo cliente;
- bloqueio de avaliação duplicada.

Mensagem-chave:

> A conclusão gera evidência e reputação para o prestador.

### 9. Cancelamento

Mostre um chamado cancelado ou cancele um chamado de teste.

Mensagem-chave:

> O cancelamento registra política e status de reembolso no histórico.

### 10. Admin

Entre como admin e mostre:

- categorias;
- relatórios;
- controle básico da plataforma.

## Fechamento

Finalize com:

- stack usada;
- arquitetura;
- validação E2E;
- homologação em usuários reais;
- recursos já implementados: recuperação por e-mail, login social Google,
  notificações push via Firebase/FCM e configuração versionada para deploy;
- o que depende da etapa operacional: publicar a API e o app em produção,
  informar as credenciais de produção (SMTP, Google e Firebase), assinar o
  release com keystore externo e publicar na loja.

## Plano B para apresentação

Se o serviço de mapa ou rota estiver indisponível:

- explique que o mapa usa OpenStreetMap e a rota usa OSRM, sem chave externa;
- demonstre que a busca por raio continua funcionando pelos cards/listagem;
- mostre a distância em linha reta usada como fallback da rota.

Se GPS falhar no emulador:

- use dispositivo físico;
- ou demonstre fallback por cidade AMAUC.

Se a internet cair:

- use dados seed;
- mantenha backend e banco locais rodando.
