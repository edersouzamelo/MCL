# S1-0 — Contenção da Data API do Supabase

Status: **EXECUTADO E VERIFICADO — 12 AGO 2026**

- Data do snapshot: 12 AGO 2026
- Projeto: MCL
- Baseline da aplicação: `258a24c74f30392ccea122727a5e174bd3e9a2a0`

## Objetivo

Fechar o acesso indiscriminado da Data API às tabelas do MCL sem alterar dados,
schema, RLS ou a conexão PostgreSQL usada pelo Prisma.

Este lote não corrige CATMAT, autenticação da aplicação, branches, dependências
ou interface.

## Evidência anterior ao lote

- 45 tabelas no schema `public`, todas de propriedade de `postgres`.
- Hash canônico dos nomes: `979d0ed2f36e9c36b44a76d3bbf7c46d`.
- 0 tabelas com RLS; 0 políticas; 0 views; 0 funções; 0 sequências.
- `anon` e `authenticated` possuem os oito privilégios de tabela do PostgreSQL
  17 em 45/45 objetos: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES,
  TRIGGER e MAINTAIN.
- `service_role` possui os mesmos privilégios em 45/45 tabelas.
- Não existe `supabase-js`, `@supabase/ssr`, `/rest/v1` ou chave pública
  Supabase no código versionado. O runtime usa `DATABASE_URL` com Prisma.
- Logs da Data API das últimas 24 horas: nenhum evento.
- Endpoint de produção `/api/health/db`: HTTP 200 e banco `UP`.
- Conexões observadas: PostgREST como `authenticator` e conexão direta via
  Supavisor como `postgres`.

Contagens sentinela do snapshot:

| Tabela | Linhas |
| --- | ---: |
| User | 5 |
| catmat_items | 5.994 |
| AuditLog | 28 |
| CoverageQuery | 18 |
| CatmatMapping | 1 |
| ItemCatalogMapping | 7 |
| ArpUnitRecord | 0 |
| Need | 3 |
| NeedItem | 1 |

## Decisão do lote

### Objetos existentes

- Revogar todos os privilégios de tabela de `anon` e `authenticated`.
- Revogar privilégios de sequências desses dois papéis, embora hoje não existam
  sequências públicas.
- Revogar EXECUTE de funções para `PUBLIC`, `anon` e `authenticated`,
  embora hoje não existam funções públicas.
- Preservar os privilégios atuais de `service_role` nos objetos existentes.
  Esse papel usa chave secreta, não é a porta pública que motivou o P0, e a
  preservação reduz o raio de impacto desta contenção inicial.

### Objetos futuros criados por postgres

- Retirar privilégios automáticos de tabelas, funções e sequências para
  `anon`, `authenticated` e `service_role`.
- Retirar EXECUTE automático de funções para `PUBLIC`.
- Qualquer futura exposição passa a exigir GRANT explícito e, se usar a Data
  API, política RLS específica.

### O que permanece inalterado

- Nenhuma tabela é removida, renomeada ou modificada.
- Nenhuma linha é inserida, atualizada, apagada ou truncada.
- RLS permanece desabilitado nesta canaleta.
- `USAGE` do schema `public` permanece intacto.
- Privilégios atuais de `service_role` permanecem intactos.
- A conexão direta do Prisma permanece intacta.

## Arquivos

1. `00_snapshot.sql` — reconfirma pré-condições e contagens.
2. `10_apply.sql` — lote transacional de contenção.
3. `20_verify.sql` — verifica grants e invariantes após aplicação.
4. `90_rollback.sql` — restaura exatamente o modelo de grants anterior.

## Ordem de execução futura

1. Executar `00_snapshot.sql` e comparar com esta página.
2. Confirmar que produção continua com `/api/health/db` em estado `UP`.
3. Aplicar `10_apply.sql` uma única vez.
4. Executar `20_verify.sql`.
5. Fazer teste negativo da Data API com chave publicável: deve retornar
   permissão negada/código PostgreSQL `42501`.
6. Confirmar `/api/health/db` em `UP`.
7. Fazer login no MCL e executar uma busca CATMAT controlada. O defeito
   “coturno → ovo” continuará fora do escopo; o teste procura somente erro de
   banco/permite confirmar que o Prisma continua lendo e gravando.
8. Recontar `AuditLog` e `CoverageQuery`; a ação controlada deve aparecer.
9. Parar e registrar a evidência.

## Gatilhos de rollback

Executar `90_rollback.sql` imediatamente se ocorrer qualquer condição:

- `/api/health/db` deixa de retornar `UP`;
- o servidor apresenta `permission denied` ou código `42501`;
- login ou fluxo mínimo deixam de funcionar por acesso ao banco;
- contagens sentinela diminuem ou divergem sem explicação;
- é descoberta dependência real da Data API não inventariada.

## Limitações conhecidas

- A contenção deve ser verificada pela matriz de grants, e não depender do
  resultado do Security Advisor. Após a execução, o Advisor retornou zero
  lints, embora RLS permaneça deliberadamente fora deste lote.
- Existem default ACLs do papel interno `supabase_admin`. Os 45 objetos atuais
  pertencem a `postgres` e ficam contidos por este lote. Até o controle
  gerenciado de “exposição automática” ser revisto no Dashboard, nenhum objeto
  público deve ser criado por fluxo que use `supabase_admin` sem auditoria de
  grants.
- RLS por domínio será uma etapa posterior, depois da contenção e da matriz real
  de autorização. Não criar políticas genéricas em massa.

## Referências

- [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Breaking change: tables not exposed automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## Resultado da execução

- Lote transacional aplicado em produção às 19:24 UTC (15:24 UTC-4).
- `anon`: 0/45 tabelas em cada um dos oito privilégios.
- `authenticated`: 0/45 tabelas em cada um dos oito privilégios.
- `service_role`: 45/45 tabelas em cada um dos oito privilégios existentes.
- Default ACL de `postgres`: zero exposição futura para `PUBLIC`, `anon`,
  `authenticated` e `service_role`.
- Data API com chave publicável: acesso anterior HTTP 200; acesso posterior
  negado com código PostgreSQL `42501` e HTTP 401 nos logs da API.
- Aplicação: `/api/health/db` permaneceu HTTP 200 e banco `UP`.
- Smoke autenticado: necessidade lida via Prisma; busca CATMAT gravou uma nova
  `CoverageQuery` e um novo `AuditLog` sem erro de permissão.
- Sentinelas: nenhuma contagem diminuiu; `CoverageQuery` passou de 18 para 19 e
  `AuditLog` de 28 para 29 por causa do teste controlado.
- Security Advisor após o lote: zero lints retornados.
- Rollback não acionado.
- Evidência detalhada: `30_execution_evidence.md`.

O smoke CATMAT retornou `NO_RESULTS`. Isso confirma que o defeito funcional da
busca continua fora do S1-0 e deverá ser tratado em lote próprio.
