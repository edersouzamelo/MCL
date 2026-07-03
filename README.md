# MCL | Piloto Classe II v0.1.0

**AMBIENTE DEMONSTRATIVO - DADOS SINTETICOS - NAO CONSTITUI SISTEMA OFICIAL**

Protótipo web demonstrativo do **Modelo de Continuidade Logística - MCL**, criado para materializar a continuidade informacional entre necessidade, cobertura, aquisição, crédito, estoque, unidade logística, remessa e entrega em um cenário sintético de suprimento Classe II.

Autor do modelo: **Edervaldo José de Souza Melo**  
ORCID: **0009-0003-6835-135X**  
Referência relacionada: https://doi.org/10.5281/zenodo.21053127

## Tese

O problema não é faltar sistema. É faltar continuidade entre eles.

O MCL não substitui ERP, sistema patrimonial, SIAFI, SIGELOG ou qualquer sistema oficial. Ele atua como camada demonstrativa de correlação, rastreabilidade e visibilidade: preserva origem, fonte, confiança, horário, natureza do dado e trilha auditável.

## Escopo da v0.1.0

- Next.js App Router, TypeScript estrito, Tailwind CSS e PWA simples.
- Autenticação demonstrativa via Auth.js/NextAuth e OAuth GitHub/Google configurável.
- Dados sintéticos para fardamento Classe II e primeiro conector público somente leitura para Compras.gov.br, com pesquisa CATMAT orientada pela necessidade.
- Dashboard, necessidades, aquisições, passaporte digital, QR Code, scanner com fallback manual, registro de eventos, linha do tempo, conectores, divergências, importação CSV/JSON e auditoria.
- Schema Prisma/PostgreSQL, Docker Compose local e seed determinístico.
- Testes unitários e fluxo Playwright.
- Script `pnpm release:artifact` para ZIP v0.1.0, manifesto e checksum.

## Capturas

As capturas são geradas por `pnpm screenshots` em `docs/screenshots/`. Nesta execução local, o Chromium do Playwright não estava instalado e o download do navegador foi bloqueado pelo ambiente; o script permanece pronto para gerar login, dashboard, necessidade, passaporte, scanner, evento, linha do tempo, conectores, divergências e auditoria.

## Execução rápida

```bash
pnpm install --config.confirmModulesPurge=false
cp .env.example .env
pnpm dev
```

No Windows, se `pnpm` nao estiver no PATH, use:

```powershell
.\iniciar-mcl.cmd
```

ou:

```powershell
npm.cmd run dev -- -p 3010
```

Acesse `http://localhost:3000`, use o código demonstrativo `MCL-DEMO-2026` e abra o scanner manual com:

```text
MCL:UL:ul-coturno-caixa-001
```

## Banco PostgreSQL

```bash
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

O app roda imediatamente pelo store demonstrativo em memória. O PostgreSQL está preparado para migração/seed quando `DATABASE_URL` estiver configurada em `prisma.config.ts`.

Auditoria do banco: `docs/DATABASE_AUDIT.md`.

## Conector Compras.gov.br

O piloto inclui o conector `COMPRAS.GOV - API PUBLICA OFICIAL`, somente leitura, usando CATMAT e ARP:

- `/modulo-material/4_consultarItemMaterial`
- `/modulo-arp/2_consultarARPItem`
- `/modulo-arp/3_consultarUnidadesItem`

Variáveis opcionais:

```env
COMPRAS_GOV_API_BASE_URL=https://dadosabertos.compras.gov.br
COMPRAS_GOV_SYNC_ENABLED=true
COMPRAS_GOV_PAGE_SIZE=10
COMPRAS_GOV_REQUEST_TIMEOUT_MS=12000
COMPRAS_GOV_CACHE_TTL_SECONDS=300
COMPRAS_GOV_UNIT_CODE=
COMPRAS_GOV_CATMAT_CODE=
COMPRAS_GOV_MODALITY_CODE=
COMPRAS_GOV_DATE_START=
COMPRAS_GOV_DATE_END=
COMPRAS_GOV_KEYWORD=
```

Fluxo principal: abrir `/necessidades/need-coturno-200/buscar-cobertura`, pesquisar CATMAT, confirmar manualmente o código, consultar atas, consultar unidades/saldos e registrar possível cobertura. A sincronização genérica sem CATMAT ou UASG é bloqueada para evitar importação sem contexto.

Documentação: `docs/COVERAGE_FLOW.md` e `docs/connectors/COMPRAS_GOV.md`.

## OAuth

Variáveis esperadas:

```env
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DEMO_AUTH_ENABLED=true
DEMO_ACCESS_CODE=MCL-DEMO-2026
```

Login social não equivale a identidade institucional. Em eventual implantação institucional, o provedor demonstrativo deverá ser substituído ou integrado a um provedor autorizado.

## Testes e qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm release:artifact
```

## Implantação

O projeto contém `vercel.json` e documentação em `docs/DEPLOYMENT.md`. Para produção, configure PostgreSQL/Neon, Auth.js, OAuth callbacks e `WEBHOOK_INGEST_SECRET` em variáveis seguras da Vercel.

## Artefato Zenodo

```bash
pnpm release:artifact
```

Saída esperada:

```text
dist/release/mcl-piloto-classe-ii-v0.1.0.zip
dist/release/SHA256SUMS.txt
dist/release/release-manifest.json
```

Não há licença aberta definida neste repositório. Não há endosso institucional declarado. Não insira dados reais, classificados, credenciais, saldos, contratos, fornecedores reais, rotas ou vulnerabilidades internas.
