# Relatório de Testes

Execução em 2026-07-02.

| Comando | Resultado |
|---|---|
| `pnpm lint` | passou |
| `pnpm typecheck` | passou |
| `pnpm test` | passou: 5 arquivos, 22 testes |
| `pnpm build` | passou: Next.js 16.2.9 |
| `pnpm release:artifact` | passou |
| `pnpm test:e2e` | bloqueado: Chromium do Playwright ausente |

Detalhe do E2E: Playwright reportou ausência de `chrome-headless-shell.exe` no cache `ms-playwright`. A tentativa de `pnpm exec playwright install chromium` exigiu download externo e foi recusada pelo ambiente por limite de uso. O teste permanece implementado em `tests/e2e/pilot-flow.spec.ts`.

Cobertura nova: conector Compras.gov.br com paginacao, timeout, API indisponivel, resposta invalida, resposta vazia, duplicidade, idempotencia, transformacao, quarentena, concorrencia, vinculo manual e autorizacao.

Artefato:

- `dist/release/mcl-piloto-classe-ii-v0.1.0.zip`
- checksum em `dist/release/SHA256SUMS.txt`
