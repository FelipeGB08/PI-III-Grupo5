# Segurança

## Dependências conhecidas

Em 19 de julho de 2026, `npm audit` reporta seis alertas moderados originados
exclusivamente na cadeia transitiva abaixo:

```text
firebase-admin -> @google-cloud/storage -> gaxios/retry-request/teeny-request -> uuid
```

O alerta raiz é o `GHSA-w5hq-g745-h8pq` (`CVE-2026-41907`) do pacote `uuid`
anterior à versão 11.1.1. Ele afeta as funções v3, v5 e v6 quando recebem um
buffer e um offset externos sem limites válidos.

O backend usa o Firebase Admin somente para Cloud Messaging e não chama Cloud
Storage nem as funções vulneráveis do `uuid`. A versão mais recente disponível
do Firebase Admin (`14.2.0`) ainda fixa `@google-cloud/storage` em uma linha que
depende das versões sinalizadas. O `npm audit fix` não oferece correção segura;
a sugestão automática é voltar quatro versões principais para
`firebase-admin@10.3.0`, trocando um SDK atual por outro de 2022 sem uma migração
controlada. Forçar overrides também exigiria majors potencialmente incompatíveis
de `gaxios`, `retry-request` e `teeny-request`.

Por isso, o risco moderado é aceito temporariamente. Não há alertas altos ou
críticos. A pendência deve ser reavaliada quando o Firebase Admin atualizar sua
dependência de `@google-cloud/storage` ou quando o pacote de Storage publicar uma
linha compatível com as dependências corrigidas.
