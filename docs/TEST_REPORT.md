# Relatório de Testes

## Execução em 2026-09-08 — Assistente IA Gateway OIDC/RAG

Branch: `codex/assistente-rag-oidc`

Baseline: `7350af8`

| Comando | Resultado |
|---|---|
| `pnpm lint` | aprovado: 0 erros; 26 avisos preexistentes ou fora deste lote (baseline: 27) |
| `pnpm typecheck` | aprovado |
| `pnpm test` | aprovado: 20 arquivos, 102 testes |
| `pnpm build` | aprovado: Next.js 16.2.9 e rota `/api/ai/chat` dinâmica em runtime Node.js |
| `pnpm test:e2e` | bloqueado: executável Chromium do Playwright ausente |
| chamada LLM local | não executada: `VERCEL_OIDC_TOKEN` ausente no runtime local |

O comando E2E inicialmente encontrou `uv_interface_addresses` ao iniciar o Next sem hostname. `playwright.config.ts` foi corrigido para usar `127.0.0.1`; o servidor passou a iniciar e a execução alcançou o Playwright, que então confirmou o bloqueio remanescente por ausência de `chrome-headless-shell`.

Cobertura adicionada:

- autenticação obrigatória em `/api/ai/chat`;
- validação de prompt, escopo e histórico;
- encaminhamento de ator e `requestId` ao agente;
- falha financeira explícita sem resposta falsa;
- recuperação RAG com conhecimento versionado e citações;
- bloqueio dos silos Crédito/TG e SAG/Grupamento;
- ausência de números financeiros em ferramenta bloqueada;
- histórico conversacional tipado;
- classificação de orçamento esgotado no Gateway;
- limite defensivo de 10 requisições por usuário/minuto.

O teste de integração real do Gateway depende de um deploy Vercel com AI Gateway/OIDC habilitado. Até essa evidência existir, o lote está validado em código e build, mas não homologado operacionalmente.

Execução em 2026-07-02.

| Comando | Resultado |
|---|---|
| `pnpm lint` | passou |
| `pnpm typecheck` | passou |
| `pnpm test` | passou: 6 arquivos, 37 testes |
| `pnpm build` | passou: Next.js 16.2.9 |
| `pnpm release:artifact` | passou |
| `pnpm test:e2e` | bloqueado: Chromium do Playwright ausente |

Detalhe do E2E: Playwright reportou ausência de `chrome-headless-shell.exe` no cache `ms-playwright`. A tentativa de `pnpm exec playwright install chromium` exigiu download externo e foi recusada pelo ambiente por limite de uso. O teste permanece implementado em `tests/e2e/pilot-flow.spec.ts`.

Cobertura nova: conector Compras.gov.br com paginacao, timeout, API indisponivel, resposta invalida, resposta vazia, duplicidade, idempotencia, transformacao, quarentena, concorrencia, vinculo manual, autorizacao, alem de testes dedicados para a formula de deficit e o modelo de confianca deterministico.

Artefato:

- `dist/release/mcl-piloto-classe-ii-v0.1.0.zip`
- checksum em `dist/release/SHA256SUMS.txt`
