# Execução e Runtime do Banco de Dados PostgreSQL

Este documento apresenta a arquitetura de persistência real configurada para o MCL Piloto Classe II utilizando PostgreSQL/Neon com Prisma.

## Variáveis de Ambiente Requeridas
As variáveis a seguir devem ser declaradas no arquivo `.env` para execução local ou nas configurações de ambiente do Vercel/provedor de hospedagem:

```bash
DATABASE_URL="postgresql://mcl:mcl_demo_password@localhost:5432/mcl_piloto?schema=public"
DIRECT_URL="postgresql://mcl:mcl_demo_password@localhost:5432/mcl_piloto?schema=public"
```

## Modo de Persistência
A persistência suporta dois modos dinâmicos por meio da função `persistenceMode()`:
1. **Modo PostgreSQL (`postgresql`):** Ativado quando a variável `DATABASE_URL` está preenchida. Toda a gravação e leitura de entidades de cobertura de material é persistida em banco de dados real. Em produção, este modo é obrigatório e falhas na conexão impedirão execuções silenciosas em memória.
2. **Modo Memória (`demo-memory`):** Fallback demonstrativo usado quando `DATABASE_URL` está nula. Para rotas operacionais de consulta de atas, esse modo deve estar explicitamente autorizado por `MCL_ALLOW_MEMORY_FALLBACK=true`; caso contrario, a API retorna erro claro em vez de fingir persistencia real.

Quando o modo memoria estiver ativo, a interface deve exibir:

```text
MODO MEMORIA - DADOS NAO PERSISTENTES
```

## Migrations do Prisma
As migrations de banco de dados ficam localizadas no diretório [prisma/migrations](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/prisma/migrations).

A migration inicial é:
* `20260703000000_init_schema` — Criação das tabelas do piloto (Usuários, Necessidades, Itens, Eventos, Auditoria) e tabelas da Análise de Cobertura de Materiais (`MaterialCoverageAnalysis` e `AcquisitionCoverageCandidate`).

Para aplicar as migrações em desenvolvimento:
```bash
npm run db:migrate
```

Para aplicar as migrações em produção:
```bash
npm run db:deploy
```

## Seed de Dados Sintéticos
Para popular o banco com dados demonstrativos (necessidades de coturnos, gandolas, calças, camisetas, usuários de teste, estoques iniciais):
```bash
npm run db:seed
```

## Rollback e Limitações
* Se precisar resetar o banco de dados local: `npx prisma migrate reset`
* **Limitações:** O MCL consome dados oficiais em tempo de execução via API do governo. O banco de dados serve para cache de consultas de cobertura, armazenamento de decisões de mapeamento (CATMAT) do gestor e trilhas de auditoria, além de registrar o rastro técnico da execução das APIs.
