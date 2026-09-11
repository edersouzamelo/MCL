# Contrato contábil do módulo Créditos

Referência funcional conferida novamente em 11 SET 2026 nas dez páginas do Power BI público do Mendes, atualizado às 09:13. Este documento separa valores de fonte, relações derivadas e dados gerenciais; nenhum percentual fixo ou saldo sintético é permitido.

## Relações reconciliadas

Todos os valores monetários são calculados em centavos.

| Indicador | Relação | Reconciliação observada |
|---|---|---|
| Crédito disponível global | Provisão atualizada − despesa empenhada | 44.474.644,19 − 41.417.730,86 = 3.056.913,33 |
| % empenhado | Despesa empenhada ÷ provisão atualizada | 93,13% |
| Empenhado a liquidar | Despesa empenhada − despesa liquidada | 41.417.730,86 − 19.968.540,17 = 21.449.190,69 |
| % liquidado | Despesa liquidada ÷ provisão atualizada | 44,90% |
| RPNP a liquidar | Inscrito/reinscrito − liquidado − cancelado | 8.707.966,70 − 8.457.364,88 − 385,80 = 250.216,02 |
| % RPNP liquidado | RPNP liquidado ÷ inscrito/reinscrito | 97,12% |
| % RPNP cancelado | RPNP cancelado ÷ inscrito/reinscrito | 0,00% após arredondamento visual |
| Quantidade SRP disponível | Quantidade registrada − quantidade empenhada | 10.088.646 − 3.020.837 = 7.067.809; fonte de compras, não TG |
| Valor SRP disponível | Valor homologado − valor empenhado | 126.333.767,05 − 35.486.312,97 = 90.847.454,08; fonte de compras, não TG |

Em 11 SET, o total da tabela de NCs e o cartão global fecharam em R$ 3.056.913,33. Essa igualdade deve ser uma reconciliação, não uma premissa: se uma NE não tiver vínculo recuperável com sua NC de referência, registrar a divergência e não distribuí-la artificialmente.

O campo `Dias` da tela de NE corresponde, nos registros recentes conferidos, à diferença entre a data de atualização do dashboard e a data de emissão da NE. O cartão `Saldo a liq de NEs >30 dias` agrega o saldo a liquidar condicionado por essa idade. A regra de calendário e eventuais exceções ainda precisam ser homologadas; não presumir dias úteis.

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

O arquivo recebido em 11 SET tem uma aba, 2.098 linhas totais e 2.092 linhas após o cabeçalho. Apenas 103 linhas repetem PI, 1.578 repetem NE e todas repetem ND/medida. São níveis distintos da mesma grade hierárquica. O somatório bruto de todas as linhas é inválido por dupla contagem.

O Power BI declara no consolidado as UGs `160136` e `167136`. O relatório atual declara no cabeçalho somente `UG Executora: 160136`. A nova consulta deve tornar a UG uma dimensão visível e reproduzir explicitamente o mesmo escopo antes de qualquer comparação de total.

## Desenho de teste para o relatório TG V2

Preservar a assinatura atual até a validação. Duplicar o relatório e exportar primeiro uma amostra manual. Se o TG permitir várias grades/abas no mesmo XLSX, usar os três contratos abaixo; caso contrário, manter três assinaturas independentes.

### Execução do exercício

- Linhas/dimensões visíveis: UG Executora, UGR, PTRES, Ação, PI, Fonte de Recursos detalhada, Natureza de Despesa detalhada, `Item Informação`, NE CCor, ano/data/descrição/tipo da NE e favorecido.
- Métrica: `Movim. Líquido - R$`.
- Escopo: exercício 2026 e UGs do consolidado 160136 e 167136.
- No seletor de `Item Informação`, procurar conceitos de provisão atualizada, despesa empenhada, despesa liquidada e despesa paga. Os nomes exatos devem vir do catálogo do próprio TG e de uma exportação; não homologar por memória.

### Documentos de crédito e empenho

- Tornar visíveis NC, NE, data de emissão, UG emitente/destinatária, documento de referência, observação/descrição, PI, ND, UGR/PTRES/Ação e favorecido quando esses atributos existirem no catálogo.
- Procurar especificamente o vínculo NC↔NE e o RO. Se o catálogo TG não expuser RO/finalidade, classificar esses campos como lacuna de fonte e encaminhá-los ao contrato SAG, sem extração por texto como regra contábil.

### RPNP

- Linhas/dimensões visíveis: UGE, NE original e ano, descrição, favorecido, PI, ND, SI/tipo, `Item Informação`.
- Procurar no catálogo os conceitos de inscrito/reinscrito, liquidado, cancelado e pago de RPNP; preservar cada valor-fonte separadamente.
- Calcular `RPNP a liquidar` apenas como reconciliação do contrato e sinalizar qualquer divergência.

### Regras de exportação

- `Item Informação` deve aparecer como coluna por registro, não apenas dentro do título da medida.
- Evitar totais/subtotais na exportação tabular, ou identificá-los de forma inequívoca; nunca somar pai e filho.
- Repetir rótulos de dimensões em todas as linhas se a opção existir. Caso o TG ainda suprima valores repetidos, o parser poderá fazer preenchimento hierárquico somente dentro de uma grade identificada.
- Manter nomes de abas e cabeçalhos estáveis depois da homologação.

## Fonte não contábil

| Campo/visão | Fonte correta ou estado |
|---|---|
| Pregão, ata, item, fornecedor, vigência, quantidade e valor registrado/empenhado | Compras.gov/PNCP/SIASG |
| Justificativa, previsão de empenho e prazo de liquidação | Cadastro gerencial MCL; SAG somente se houver campo documental verificável |
| Metas por Ação e Resultado Lei | Cadastro parametrizado e versionado no MCL, com autoria e vigência |
| Classificação Requisitante/RPCM e OM solicitante | SAG ou tabela organizacional MCL; não deriva de saldo contábil |
| Links para documentos digitalizados | Drive/repositório documental |
| RO e finalidade/observação | Verificar primeiro no catálogo TG; se ausentes, mapear contrato SAG separado |

Para alimentar os cartões e tabelas, o relatório mestre precisa tornar explícito o Item Informação em cada valor (como dimensão/coluna) e incluir os campos documentais necessários, ou conter abas separadas no mesmo XLSX com contratos identificáveis. Até isso ocorrer, a carga prova recebimento e permite auditoria da medida original, mas não autoriza preencher os saldos das dez páginas.
