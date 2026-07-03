# Consulta de cobertura orientada pela necessidade

## Fluxo

1. Abrir uma necessidade em `/necessidades`.
2. Entrar em `/necessidades/[id]/buscar-cobertura`.
3. Pesquisar candidatos CATMAT no Compras.gov.br.
4. Confirmar manualmente um CATMAT.
5. Consultar atas vigentes somente para o CATMAT confirmado.
6. Abrir uma ata e consultar unidades/saldos retornados pela fonte.
7. Ler a sintese deterministica e registrar possivel cobertura.

O MCL nao seleciona CATMAT com LLM e nao classifica item publico como `CLASSE_II` automaticamente. Registros externos do Compras.gov.br entram como `EXTERNAL_UNMAPPED` / `PENDENTE_CORRELACAO` ate confirmacao humana.

## Endpoints oficiais usados

Fonte oficial da especificacao: `https://dadosabertos.compras.gov.br/swagger-ui/index.html` e OpenAPI em `https://dadosabertos.compras.gov.br/v3/api-docs`.

- `GET /modulo-material/4_consultarItemMaterial`
  - filtros usados: `descricaoItem`, `codigoItem`, `codigoGrupo`, `codigoClasse`, `codigoPdm`, `statusItem`.
- `GET /modulo-arp/2_consultarARPItem`
  - obrigatorios no fluxo: `codigoItem`, `dataVigenciaInicialMin`, `dataVigenciaInicialMax`, `tipoItem=Material`.
  - opcionais: `codigoUnidadeGerenciadora`, `codigoModalidadeCompra`, `codigoPdm`, `niFornecedor`, `numeroCompra`.
- `GET /modulo-arp/3_consultarUnidadesItem`
  - obrigatorios: `numeroAta`, `unidadeGerenciadora`, `numeroItem`.
  - opcional: `dataAtualizacao`.

## Persistencia PostgreSQL/Neon

O schema Prisma possui as entidades do fluxo:

- `CoverageQuery`
- `CatalogSearchCandidate`
- `ItemCatalogMapping`
- `ArpUnitRecord`
- `ExternalRecord`
- `ConnectorRun`
- `AcquisitionInstrument`
- `ObjectLink`
- `AuditLog`

Variaveis esperadas:

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
DEMO_ACCESS_CODE="MCL-DEMO-2026"
COMPRAS_GOV_API_BASE_URL="https://dadosabertos.compras.gov.br"
```

Comandos:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:deploy
```

Em producao, configure `DATABASE_URL` no Vercel antes do deploy. O Prisma 7 le a URL em `prisma.config.ts`. Sem essa variavel, o piloto continua em modo demonstrativo com estado em memoria do processo.

## Limitacoes da sintese

A sintese e deterministica. Ela informa deficit, atas vigentes, quantidade potencial, precos, saldo consultavel e limitacoes. O MCL nao recalcula saldo oficial quando a API nao retorna um campo especifico e nao transforma quantidade potencial em decisao administrativa.
