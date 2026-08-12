# Implantação

## Vercel

1. Criar projeto Vercel para este repositório.
2. Configurar PostgreSQL Neon ou Postgres compatível.
3. Definir variáveis seguras: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, OAuth, `DEMO_AUTH_ENABLED`, `DEMO_USER_PASSWORD`, `NEXT_PUBLIC_APP_URL`, `WEBHOOK_INGEST_SECRET`.
4. Configurar callbacks OAuth.
5. Rodar migrações e seed demonstrativo apenas em ambiente autorizado.
6. Executar `pnpm build`.

Sem credenciais válidas, nenhuma URL real deve ser inventada.
