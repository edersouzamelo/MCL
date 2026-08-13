# Gate G5 — Síntese Determinística Completa

Status: **CONCLUÍDO E VERIFICADO**

- Data: 13 AGO 2026
- Baseline Git: `2c5a5e4`
- Branch: `main`

## Objetivo

Garantir que a consolidação de cobertura, saldo de adesões das UGs, custo estimado total e nível de déficit da necessidade seja 100% determinística, reproduzível e auditável via algoritmo no backend (`buildCoverageSynthesis`), sem qualquer inferência opaca por LLM.

## Garantias e Cálculos Determinísticos

1. **Saldo de Adesões Consolidado (`totalAdhesionBalance`)**:
   - Quando as unidades e saldos são consultados na API do Compras.gov.br (`/modulo-arp/3_consultarUnidadesItem`), o algoritmo soma os campos `saldoAdesoes` e `saldoRemanejamentoEmpenho` de cada UG participante.
   - O resultado é exibido no painel "Síntese Determinística" sob a métrica **`Saldo Adesões (UGs)`**.

2. **Cálculo da Cobertura de Déficit**:
   - `Déficit` = `Quantidade Solicitada` - `Estoque Reservado`.
   - Se `totalAdhesionBalance >= déficit`, a síntese gera a frase explícita:  
     `A consulta de UGs retornou X unidades de saldo para carona/adesão, COBRINDO INTEGRALMENTE o déficit de Y unidades.`

3. **Projeção Financeira Estimada (`estimatedMinTotalCost` / `estimatedMaxTotalCost`)**:
   - `Custo Mínimo` = `Menor Valor Unitário da Ata` × `Déficit`.
   - `Custo Máximo` = `Maior Valor Unitário da Ata` × `Déficit`.

4. **Transparência de Rastro (`QueryTrace`)**:
   - Todos os dados da Síntese contêm rastro completo de proveniência (URL consultada, timestamp, payloadHash, número da ata, UG e requisição).

## Validação e Qualidade

- [x] Typecheck: 0 erros (`npm run typecheck`).
- [x] Testes unitários: 78/78 aprovados (`npm test`).
- [x] Renderização e recálculo da Síntese ao consultar unidades verificados na interface.
