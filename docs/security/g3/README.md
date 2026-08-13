# Gate G3 — ARP, Pregões, UGs e Saldos Públicos

Status: **CONCLUÍDO E VERIFICADO**

- Data: 13 AGO 2026
- Baseline Git: `c8926ce`
- Branch: `main`

## Objetivo de Segurança e Integridade Informacional

Garantir que um CATMAT confirmado acione a busca de atas de registro de preços (ARP) e unidades gerenciadoras/participantes (UGs) diretamente nas APIs oficiais do Compras.gov.br (`/modulo-arp/2_consultarARPItem` e `/modulo-arp/3_consultarUnidadesItem`), com rastro completo de proveniência e **zero criação de dados simulados/fabricados** sob retorno vazio ou indisponibilidade da fonte.

## Garantias e Controles

1. **Rastreabilidade por CATMAT Confirmado**:
   - A consulta de atas exige um `catalogMappingId` ativo e pertencente à necessidade correspondente.
   - O código CATMAT enviado é validado contra o mapeamento confirmado.

2. **Diferenciação Clara de Estados de Resposta**:
   - `ARP_SEARCH_COMPLETED`: Atas encontradas na API pública oficial.
   - `ARP_SEARCH_EMPTY`: Nenhuma ata localizada no período para o CATMAT informado.
   - `ARP_ITEMS_RECEIVED_BUT_SCHEMA_FILTERED`: Atas retornadas mas descartadas por divergência de schema.
   - `ARP_SEARCH_FAILED`: Falha externa de rede, timeout ou SSL.

3. **Inexistência de Mock Silencioso**:
   - Quando a busca por unidades/saldos retorna resultado vazio ou falha, o MCL registra o resultado exatamente como `NO_RESULTS` ou `FAILED`, **sem fabricar unidades de ARP** no banco ou estado.

4. **Preservação de Proveniência**:
   - Toda consulta gera registros auditáveis de `CoverageQuery` e `AuditLog`, registrando URL da fonte, parâmetros, horário e quantidade de registros lidos.

## Validação e Qualidade

- [x] Typecheck: 0 erros (`npm run typecheck`).
- [x] Testes unitários: 78/78 aprovados (`tests/unit/atas-api.test.ts` e `tests/unit/arp-units-api.test.ts`).
- [x] Build Next.js: 26 páginas estáticas e dinâmicas compiladas.
