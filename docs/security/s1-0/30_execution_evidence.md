# S1-0 — Evidência de execução

- Data: 12 AGO 2026
- Projeto Supabase: `plheckntnlgmksmrcvqp`
- Resultado: **SUCESSO — SEM ROLLBACK**

## Controles prévios à execução

- A revisão técnica bloqueou a aplicação até que as pré-condições cobrissem
  todos os objetos alcançados pelo lote, a preservação de `service_role` fosse
  verificada nos oito privilégios e o rollback recompusesse também as default
  ACLs.
- O T0 foi registrado antes da mutação e a verificação incluiu o fluxo
  autenticado real do MCL. O health check isolado não comprovaria escrita via
  Prisma.

## T0

- 45 tabelas públicas; hash
  `979d0ed2f36e9c36b44a76d3bbf7c46d`; todas de `postgres`.
- `anon`, `authenticated` e `service_role`: oito privilégios em 45/45 tabelas.
- Data API com chave publicável: leitura de `catmat_items` HTTP 200.
- Produção: `/api/health/db` HTTP 200, banco `UP`.
- Sentinelas: `User` 5; `catmat_items` 5.994; `AuditLog` 28;
  `CoverageQuery` 18; `CatmatMapping` 1; `ItemCatalogMapping` 7;
  `ArpUnitRecord` 0; `Need` 3; `NeedItem` 1.

## Aplicação

`10_apply.sql` foi executado como uma única transação. As pré-condições e a
verificação interna passaram; o commit foi concluído sem erro.

## T1 — banco e Data API

| Controle | Resultado |
| --- | --- |
| Inventário | 45 tabelas; hash inalterado |
| RLS | 0, intencionalmente fora deste lote |
| `anon` | 0/45 nos oito privilégios |
| `authenticated` | 0/45 nos oito privilégios |
| `service_role` | 45/45 nos oito privilégios |
| Default ACL de `postgres` | 0 entradas de exposição pública futura |
| Views, materialized views e foreign tables | 0 |
| Funções públicas | 0 |
| Sequências públicas | 0 |
| REST com chave publicável | Negado com `42501`; log HTTP 401 |
| SQL como `authenticated` | Negado com `42501` |
| SQL como `service_role` | Leitura de 5.994 itens permitida |

## T1 — aplicação

- Sessão demonstrativa autenticada com sucesso.
- Rota do MCL leu `need-coturno-200`, item e variante via Prisma.
- Busca controlada por `coturno operacional` atravessou a rota autenticada e
  persistiu o resultado.
- `CoverageQuery`: 18 → 19; novo ID
  `9255cf11-5616-460c-97d9-19068d76e912`, status `NO_RESULTS`.
- `AuditLog`: 28 → 29; ação `CATMAT_PESQUISA_EXECUTADA`, resultado
  `SEM_RESULTADO`.
- `/api/health/db`: HTTP 200, banco `UP` após a aplicação.
- Nenhuma sentinela diminuiu.
- Security Advisor: zero lints após o lote.

## Decisão

S1-0 concluído. Rollback não acionado porque não houve regressão de banco,
Prisma, autenticação ou integridade das sentinelas.

O resultado `NO_RESULTS` da busca CATMAT é evidência do problema funcional já
conhecido, não uma falha da contenção de segurança.

## Riscos residuais aceitos

- Data API continua habilitada, mas sem grants de `anon` e `authenticated` nos
  objetos atuais.
- RLS continua desabilitado.
- `service_role` mantém os grants existentes nos objetos atuais.
- Default ACL do papel interno `supabase_admin` permanece fora deste lote.
- Autenticação demonstrativa, DDL CATMAT em runtime e correção semântica CATMAT
  permanecem para lotes posteriores.
