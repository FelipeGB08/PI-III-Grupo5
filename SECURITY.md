# Segurança

## Dependências conhecidas

Em 23 de julho de 2026, após `npm update` sem `--force`, `npm audit` reporta
oito vulnerabilidades moderadas e nenhuma alta ou crítica.

### Firebase Admin e Cloud Storage

```text
firebase-admin@14.2.0
  -> @google-cloud/storage@7.21.0
     -> gaxios@6.7.1 / retry-request@7.0.2 / teeny-request@9.0.0
        -> uuid@9.0.1
```

O aviso raiz é `GHSA-w5hq-g745-h8pq` (`uuid` anterior a 11.1.1), que afeta
as funções UUID v3, v5 e v6 quando recebem buffer e offset externos inválidos.
O backend usa `firebase-admin` apenas para Cloud Messaging; não usa Cloud
Storage nem chama essas funções do `uuid`.

`firebase-admin@14.2.0` e `@google-cloud/storage@7.21.0` já são as versões
mais recentes disponíveis. O `npm audit` só oferece como “correção” regredir
para `firebase-admin@10.3.0`, uma alteração incompatível e sem migração
controlada. Overrides de `gaxios`, `retry-request`, `teeny-request` ou `uuid`
em versões maiores também violariam as faixas declaradas pelo SDK. Por isso, o
risco moderado é aceito temporariamente e deve ser reavaliado quando a cadeia
oficial do Firebase publicar versões corrigidas compatíveis.

### Autocannon (somente desenvolvimento)

```text
autocannon@8.0.0 -> hyperid@3.3.0 -> uuid@8.3.2
```

É o mesmo aviso de `uuid`. `autocannon` é uma dependência de desenvolvimento
usada apenas por `npm run test:load` e não é instalada na imagem de produção.
O `npm audit` sugere `autocannon@2.0.1`, uma regressão incompatível para uma
versão muito anterior; por isso ela não foi aplicada.

As dependências transitivas com correção compatível foram atualizadas no
`package-lock.json`. Não há alertas altos ou críticos restantes.
