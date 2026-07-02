# Premissas

- O diretório pai chama-se `MCL`; o gerador Next recusou esse nome como pacote npm, então o projeto isolado foi criado em `mcl-piloto-classe-ii`.
- A v0.1.0 roda com store demonstrativo em memória para não depender de credenciais de banco.
- PostgreSQL/Prisma está modelado e preparado por `docker-compose.yml`, `prisma/schema.prisma` e `prisma/seed.ts`.
- OAuth social é capacidade demonstrativa, não identidade institucional.
- Dados, organizações, usuários, fornecedores, remessas e documentos são sintéticos.
- Integrações são simuladas e não consultam sistemas externos.
- A licença aberta não foi escolhida; `NOTICE.md` registra ausência de licença definida.
