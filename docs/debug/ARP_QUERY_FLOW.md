# ARP Query Flow - Confirmed CATMAT

This document maps the real path from the `Consultar atas` button to the ARP result rendered on screen.

## Current Flow

```text
Button "Consultar atas"
-> CoverageJourneyClient.searchAtas()
-> POST /api/coverage/atas/search
-> src/app/api/coverage/atas/search/route.ts
-> searchArpsForConfirmedCatmat(...)
-> createComprasGovClient(...).getJson(...)
-> GET https://dadosabertos.compras.gov.br/modulo-arp/2_consultarARPItem
-> comprasGovArpItemSchema + normalizeArpItem(...)
-> saveNormalizedArpItemToDb(...) or in-memory state update
-> saveAnalysisAndCandidatesToDb(...) when PostgreSQL is active
-> JSON response with ok/stage/requestId/catmatCode/count/items/trace
-> CoverageJourneyClient updates ataQueryStatus, entries, synthesis, queryTrace
```

## Steps

| Step | File | Function | Input | Output | Possible Error | Tested |
| --- | --- | --- | --- | --- | --- | --- |
| Button | `src/components/CoverageJourneyClient.tsx` | `<button onClick={searchAtas}>` | Confirmed `mapping`, date range | Click handler execution | Button disabled when no mapping | Code inspection |
| Handler | `src/components/CoverageJourneyClient.tsx` | `searchAtas()` | `need.id`, dates, confirmed mapping | Internal POST request | Missing/invalid structured payload | Code inspection |
| Fetch | `src/components/CoverageJourneyClient.tsx` | `postJson(...)` | JSON body | Parsed JSON | Non-JSON or structured error could be flattened | Code inspection |
| Route | `src/app/api/coverage/atas/search/route.ts` | `POST(request)` | JSON request + session | Standard ARP JSON | Unauthorized, invalid request, missing CATMAT, invalid mapping, timeout | Unit tests pending update |
| Mapping | `src/modules/coverage/service.ts` | `activeCatalogMappingForNeed*` | `needId` | Active CATMAT mapping | No confirmed mapping | Unit tests existing |
| Service | `src/modules/coverage/service.ts` | `searchArpsForConfirmedCatmat(...)` | Need, CATMAT mapping, date range | Query trace, entries, synthesis | External API failure, timeout, parser mismatch | Direct service test |
| HTTP | `src/modules/connectors/compras-gov/http.ts` | `createComprasGovClient().getJson(...)` | Endpoint + params | Zod-validated JSON | HTTP 4xx/5xx, AbortError, `fetch failed` | Direct service test |
| External API | Compras.gov.br | `/modulo-arp/2_consultarARPItem` | `pagina=1`, date range, `tipoItem=Material`, `codigoItem=452757` | `resultado`, totals | Empty result or upstream error | Direct real query |
| Normalization | `src/modules/connectors/compras-gov/normalizers.ts` | `normalizeArpItem(...)` | Raw ARP item | Internal instrument records | Invalid raw item shape | Existing unit tests |
| Persistence | `src/modules/coverage/service.ts` | `saveNormalizedArpItemToDb(...)`, `saveAnalysisAndCandidatesToDb(...)`, `storeCoverageQuery(...)` | Query + normalized entries | DB rows or memory state | DB unavailable, silent memory fallback | Needs stricter handling |
| Render | `src/components/CoverageJourneyClient.tsx` | `ataQueryStatus` render branch | Response stage | COMPLETED, EMPTY, TIMEOUT, ERROR UI | Loading/idle confusion | Helper tests pending |

## Reproduction Notes

- Branch inspected: `feature/material-coverage-production-v1`.
- Repair branch: `codex/repair-arp-query-from-confirmed-catmat`.
- Confirmed seed mapping for `/necessidades/need-calca-120/buscar-cobertura`:
  - `needId`: `need-calca-120`
  - `catalogMappingId`: `mapping-calca-120-default`
  - `catmatCode`: `452757`
- Direct service call with Node CA disabled failed quickly with `fetch failed`.
- Direct service call with `NODE_OPTIONS=--use-system-ca` returned a valid empty response:
  - endpoint: `https://dadosabertos.compras.gov.br/modulo-arp/2_consultarARPItem`
  - params: `pagina=1`, `dataVigenciaInicialMin=2026-01-01`, `dataVigenciaInicialMax=2026-12-31`, `tipoItem=Material`, `codigoItem=452757`
  - duration: about `572ms`
  - records: `0`
  - status: `NO_RESULTS`

## Confirmed Breakpoints

1. The frontend request currently sends only `needId`, `dataVigenciaInicialMin`, and `dataVigenciaInicialMax`. It does not include `analysisId`, `catalogMappingId`, `catmatCode`, or a client `requestId`.
2. The frontend generic fetch helper can turn a structured route error into a generic `"Falha na requisicao."`, so the ARP UI loses the precise `code`, `stage`, and `message`.
3. The memory-mode service silently falls back to simulated ARPs outside tests when the external API fails. That hides real endpoint errors and can create a false positive.
4. Runtime memory mode is not explicitly gated by `MCL_ALLOW_MEMORY_FALLBACK=true`, and the UI does not currently show a memory-mode persistence warning.

## Expected Fixed Behavior

- The button sends `needId`, `analysisId`, `catalogMappingId`, `catmatCode`, `dateStart`, `dateEnd`, and `requestId`.
- The route validates the confirmed CATMAT and returns one of:
  - `ARP_SEARCH_COMPLETED`
  - `ARP_SEARCH_EMPTY`
  - `ARP_SEARCH_FAILED`
- Empty external results render as:
  - `Nenhuma ata relacionada ao CATMAT 452757 foi encontrada no periodo consultado.`
- Timeouts and upstream failures render as explicit errors.
- The trace panel shows endpoint, params, time range, pages consulted, records returned, source URL, request id, and persistence mode.
