# Arquitetura

Monólito modular em Next.js App Router.

```mermaid
flowchart LR
  U["Usuário demonstrativo"] --> UI["Interface Next.js"]
  UI --> API["Rotas API"]
  API --> APP["Casos de uso"]
  APP --> DOM["Domínio: eventos, projeções, idempotência"]
  DOM --> STORE["Store demo em memória"]
  DOM -. futuro .-> PG["PostgreSQL via Prisma"]
  APP --> AUD["Auditoria append-only"]
  UI --> QR["QR/passaporte"]
  APP --> CONN["Conectores"]
  CONN --> GOV["Compras.gov.br API publica"]
  CONN --> STG["ExternalRecord staging"]
```

## Camadas

- Interface: páginas, scanner, formulários, dashboard.
- Aplicação: autorização, validação, orquestração.
- Domínio: entidades, eventos, projeções, divergências.
- Infraestrutura: Auth.js, Prisma, PostgreSQL, scripts, CI.
- Projeções: estado consolidado, métricas, linha do tempo.
- Conector Compras.gov.br: cliente HTTP isolado, timeout, retry, cache, validacao Zod, staging e normalizacao canonica minima.
- Cognitiva futura: contratos somente leitura em `src/modules/cognitive/contracts.ts`.
