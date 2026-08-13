# Gate G4 — Cenário Institucional Sintético Identificado

Status: **CONCLUÍDO E VERIFICADO**

- Data: 13 AGO 2026
- Baseline Git: `f39669c`
- Branch: `main`

## Objetivo

Garantir que todos os dados sintéticos do protótipo demonstrativo do MCL (necessidades, créditos, unidades militares apoiadas/provedoras e remessas sintéticas) sejam claramente identificados, rotulados e diferenciados dos dados públicos oficiais (CATMAT, ARP e UGs vindos do Compras.gov.br).

## Diretrizes e Rotulagem

1. **Separação Visual na Interface**:
   - Todo objeto derivado de simulação/cenário demonstrativo (ex: `SIM-NECESSIDADES`, `SIM-FINANCEIRO`, `SIM-AQUISICAO`) exibe o selo **`SINTÉTICO`** ou **`SINTÉTICO / DEMONSTRATIVO`**.
   - O selo é renderizado automaticamente através do componente reutilizável `SourceStamp` e nos cartões de detalhes de necessidade.

2. **Diferenciação de Origem no Modelo de Dados (`SourceOrigin`)**:
   - `PUBLICO`: Dados originados de integrações oficiais governamentais (Compras.gov.br).
   - `SINTETICO`: Dados de cenário demonstrativo sem vínculo com sistemas corporativos fechados.
   - `MANUAL`: Confirmações humanas de vinculo/mapeamento.
   - `CALCULADO`: Resultados determinísticos de cobertura e saldo.

3. **Inexistência de Dados Sensíveis Reais**:
   - Nenhuma informação real confidencial de militares, unidades ou estoques das Forças Armadas está contida ou exposta no código. Todos os registros usam qualificadores sintéticos explícitos (`Orgão Provedor Alfa`, `Organização Apoiada Bravo`, `operador.demo@mcl.invalid`).

## Validação e Qualidade

- [x] Typecheck: 0 erros (`npm run typecheck`).
- [x] Testes unitários: 78/78 aprovados (`npm test`).
- [x] Renderização de rotulagem sintética verificada nos componentes `CoverageJourneyClient` e `SourceStamp`.
