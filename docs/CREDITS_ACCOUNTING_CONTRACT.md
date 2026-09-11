# Contrato contábil do módulo Créditos

Referência funcional conferida em 10 SET 2026 nas dez páginas do Power BI público do Mendes. Este documento separa valores de fonte, relações derivadas e dados gerenciais; nenhum percentual fixo ou saldo sintético é permitido.

## Relações reconciliadas

Todos os valores monetários são calculados em centavos.

| Indicador | Relação | Reconciliação observada |
|---|---|---|
| Crédito disponível global | Provisão atualizada − despesa empenhada | 44.437.357,57 − 41.382.693,16 = 3.054.664,41 |
| % empenhado | Despesa empenhada ÷ provisão atualizada | 93,13% |
| Empenhado a liquidar | Despesa empenhada − despesa liquidada | 21.481.375,91 |
| % liquidado | Despesa liquidada ÷ provisão atualizada | 44,79% |
| RPNP a liquidar | Inscrito/reinscrito − liquidado − cancelado | 8.707.966,70 − 8.443.364,88 − 385,80 = 264.216,02 |
| % RPNP liquidado | RPNP liquidado ÷ inscrito/reinscrito | 96,96% |
| % RPNP cancelado | RPNP cancelado ÷ inscrito/reinscrito | 0,00% após arredondamento visual |
| Quantidade SRP disponível | Quantidade registrada − quantidade empenhada | Fonte de compras, não TG |
| Valor SRP disponível | Quantidade disponível × valor unitário | Fonte de compras, não TG |

O total de crédito disponível na tabela de NCs pode divergir do cartão global quando existem empenhos sem vínculo recuperável com uma NC de referência. Na leitura observada, a tabela somava R$ 3.062.754,29 e o cartão global R$ 3.054.664,41; a diferença de R$ 8.089,88 coincidia com uma NE recente. Não forçar igualdade nem distribuir a diferença artificialmente.

## Fonte necessária por página

| Página | Dados de fonte | Derivados |
|---|---|---|
| Capa | atualização da carga | estado da fonte |
| Requisitante — NC | provisão/NC, data, ação, RO, finalidade, PI, ND e empenhos vinculados | crédito disponível e % empenhado |
| Requisitante — NE | NE, descrição, PI, ND, tipo, ação, empenhado e liquidado | empenhado a liquidar, dias e % liquidado |
| Requisitante — RPNP | UGE, NE, favorecido, ND, PI, SI, tipo, inscrito/reinscrito, liquidado e cancelado | RPNP a liquidar e percentuais |
| Pregões SRP | PNCP/Compras.gov/SIASG: UGG, compra, fornecedor, ata, item, vigência, quantidade registrada/empenhada e valor unitário | quantidades, percentuais e valor disponível |
| RPCM — NC | mesmos saldos de NC | justificativa e previsão de empenho são dados gerenciais do MCL |
| RPCM — NE | mesmos saldos de NE | justificativa e prazo de liquidação são dados gerenciais do MCL |
| RPCM — RPNP | mesmos saldos de RPNP | justificativa e prazo de liquidação são dados gerenciais do MCL |
| Metas — exercício | saldos por ação/resultado/OM/PI/ND | percentuais confrontados com metas cadastradas no MCL |
| Metas — RPNP | saldos RPNP por ação/OM/PI/ND | percentuais confrontados com metas cadastradas no MCL |

## Situação do `MCL_MESTRE_EXERCICIO_2026`

O arquivo subscrito atual contém uma hierarquia por UG → PI → NE → ND e uma única medida chamada `Movim. Líquido - R$ (Item Informação)`. O valor do filtro **Item Informação não aparece no arquivo**. Portanto:

- a medida não pode ser rotulada com segurança como provisão, empenhado, liquidado, pago ou RPNP;
- linhas PI e NE são níveis da mesma hierarquia e não podem ser somadas juntas;
- o TG suprime PI e NE repetidos deixando células vazias, mesmo sem mescla Excel; o parser deve recompor a hierarquia em ordem;
- o relatório atual não traz NC, data, observação/finalidade, SI nem os diferentes saldos simultaneamente;
- metas, justificativas e prazos são cadastros gerenciais, não saldos extraídos do SIAFI;
- a página SRP exige a fonte de compras e não deve ser fabricada a partir do TG.

Para alimentar os cartões e tabelas, o relatório mestre precisa tornar explícito o Item Informação em cada valor (como dimensão/coluna) e incluir os campos documentais necessários, ou conter abas separadas no mesmo XLSX com contratos identificáveis. Até isso ocorrer, a carga prova recebimento e permite auditoria da medida original, mas não autoriza preencher os saldos das dez páginas.
