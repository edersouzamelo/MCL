# Auditoria do Banco - 2026-07-02

## Resultado

- Banco declarado no schema: PostgreSQL via Prisma (`provider = "postgresql"`).
- Banco efetivamente usado pela aplicacao hoje: store demonstrativo em memoria em `src/server/demo-store.ts`, inicializado por constantes em `src/modules/demo/data.ts`.
- Prisma existe para schema, migracao e seed, mas nenhuma rota/pagina importa `PrismaClient` no runtime da aplicacao.
- Dados atuais: constantes TypeScript carregadas em memoria; o seed Prisma e opcional.
- Persistencia entre reinicializacoes: nao persiste no modo atual. Ao reiniciar o servidor, `createDemoState()` recria o estado inicial.
- PostgreSQL/Neon: nao configurado nesta maquina porque `DATABASE_URL` e `DIRECT_URL` nao foram fornecidos.

## Decisao de implementacao

O conector foi implementado com:

- modelos Prisma preparados para PostgreSQL (`ExternalRecord`, `ConnectorRun` e campos de proveniencia);
- execucao funcional no store demonstrativo em memoria, para manter o piloto operavel sem credenciais de banco;
- documentacao explicita de que a persistencia real depende de `DATABASE_URL`, migracao Prisma e seed.

Nao foi recriado banco existente porque nao ha PostgreSQL funcional detectado no runtime atual.
