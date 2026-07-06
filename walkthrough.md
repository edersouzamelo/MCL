# Walkthrough - Sprint DB-0: Núcleo Persistente do MCL

Concluímos com sucesso a implementação do núcleo persistente de banco de dados do MCL, versionado no código e integrado de forma segura ao banco remoto PostgreSQL do Supabase via Prisma ORM.

> [!IMPORTANT]
> A Sprint DB-0 está homologada e declarada como o baseline persistente oficial do banco de dados do MCL.


## Diagnóstico do Drift e Resolução do Baseline
- **Drift Encontrado:** Ao tentar executar comandos de migração de desenvolvimento contra o banco de dados remoto do Supabase, o Prisma detectou uma incompatibilidade de histórico (drift). Isso ocorreu porque a migração inicial `20260703000000_init_schema` não estava registrada na tabela `_prisma_migrations` do banco do Supabase, apesar de suas tabelas e colunas (incluindo adições posteriores como campos extras em `User` e a tabela temporária `catmat_items`) já existirem fisicamente na base.
- **Uso do `prisma migrate resolve`:** Para alinhar o histórico de migrações sem realizar qualquer alteração destrutiva ou perda de dados no banco ativo, executamos o comando:
  ```bash
  npx prisma migrate resolve --applied 20260703000000_init_schema
  ```
  Isso registrou a migração inicial como aplicada no banco remoto e estabeleceu a linha de base (baseline) necessária.
- **Justificativa do Baseline:** O estabelecimento do baseline garantiu que a migração inicial (que criaria as tabelas legadas já existentes) fosse pulada com segurança, permitindo o isolamento exato das novas tabelas da Sprint DB-0 em uma nova migração versionada incremental, sem reiniciar ou truncar dados ativos.


## Resumo das Entregas

### 1. Modelos do Prisma e Schema Alterado
- Criados enums robustos de status (`LogLevel`, `IntegrationStatus`, `MembershipStatus`, `MappingStatus`, `ProcurementStatus`, `CoverageStatus`).
- Implementados novos modelos persistentes em [schema.prisma](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/prisma/schema.prisma):
  - **Role** e **Membership** (com índices e restrições de unicidade compostas).
  - **IntegrationRun** e **IntegrationLog** (para logs estruturados com payloads sanitizados).
  - **Item** e **CatmatMapping** (com código indexado simples e unique composto por `sourceSystem`/`sourceRecordId`).
  - **NeedItem** (com relação para `Need` e `Item`, com quantidade como `Decimal` e campo `unit`).
  - **ProcurementInstrument** e **ProcurementInstrumentItem** (com quantidades e valores `Decimal` e campo `unit`).
  - **CoverageAnalysis** e **CoverageResult** (com quantitativos em `Decimal` e campo `unit`).
  - **EventLog** (com campos de auditoria e continuidade detalhados, incluindo idempotencyKey e defaults seguros).
- Adicionadas relações Prisma bidirecionais (back-relations) explícitas entre `User`, `Organization`, `Need`, `Item`, `ProcurementInstrument`, `ProcurementInstrumentItem` e `CoverageAnalysis`.

### 2. Migration Versionada
- Criada a nova migration de forma segura: [20260706181400_add_mcl_core_persistence_models](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/prisma/migrations/20260706181400_add_mcl_core_persistence_models/migration.sql).
- Para evitar a perda de dados e resets no banco do Supabase, geramos o diff via `prisma migrate diff` contra a base ativa e executamos um `prisma migrate deploy` limpo.
- Removemos qualquer comando destrutivo do script de migração (ex.: `DROP TABLE "catmat_items"`), mantendo a integridade total do banco legado.

### 3. Proteção Contra Execução de Seeds Automáticas
- O arquivo [db.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/server/db.ts) foi modificado para assegurar que a rotina de auto-seed de desenvolvimento não seja executada no ambiente de produção/Vercel. Ela agora exige `process.env.NODE_ENV === "development"` e `process.env.ENABLE_AUTO_SEED === "true"`.

### 4. Endpoint de Saúde `/api/health/db`
- Desenvolvido em [route.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/app/api/health/db/route.ts).
- Realiza uma query nativa real (`SELECT 1`) no banco de dados.
- Responde com status higienizado (`UP` ou `DOWN`), **sem expor** quaisquer detalhes internos de conexão, credenciais ou erros sensíveis.

---

## Resultados dos Testes e Validações

### 1. Validação de Sintaxe Prisma
```bash
npx prisma validate
# Output: The schema at prisma\schema.prisma is valid 🚀
```

### 2. Aplicação de Migration
```bash
npx prisma migrate deploy
# Output: All migrations have been successfully applied.
```

### 3. Carga do Seed Atualizado
```bash
npx tsx prisma/seed.ts
# Output: MCL: Iniciando carga de dados demonstrativos Sprint DB-0...
# Seed MCL v0.1.0 concluido com dados sinteticos e persistência de dados Sprint DB-0.
```

### 4. Execução da Build Geral (`npm run build`)
- Executado e compilado com sucesso sem quaisquer erros de tipagem TypeScript ou rotas do Next.js.

### 5. Verificação de Persistência no Banco (Script `test-db.ts`)
Executamos um script que consultou diretamente o banco remoto do Supabase para conferir os dados persistidos:
- **Usuários:** 3
- **Organizações:** 3
- **Perfis (Role):** 2 (`ADMIN`, `AUDITOR`)
- **Vínculos (Membership):** 2 (Vínculos ativos de teste)
- **IntegrationRuns:** 1 (`MCL-CATMAT-SYNC`, status `SUCCESS`, com 1 log persistido)
- **AuditLogs de Teste:** 1 (Ação `SEED_DB0` gravada e persistida)
- **Itens:** 1 (Item demonstrativo CATMAT)
- **NeedItems:** 1 (Relação com Necessidade)
- **ProcurementInstruments:** 1 (ARP-2026-0001)
- **CoverageAnalyses:** 1 (Análise associada ao item)
- **EventLogs:** 1 (Evento `SYNC_COMPLETE`)
- **Conexão Direta ($queryRaw):** `[{"connected":1}]`
