# Cobertura PRDU x SISCOFIS

## Objetivo

Estabelecer no MCL a separação entre dado de necessidade, dado de estoque e visão consolidada de situação.

Fluxo alvo:

`ePRDU -> Necessidades -> correlação determinística <- Armazenagem <- SISCOFIS`

A projeção resultante é exibida em **Situação Geral**.

## Fonte de necessidade

O ePRDU deve ser tratado como uma fonte de **necessidade planejada de referência**, e não como sinônimo de toda necessidade do MCL.

Contrato mínimo esperado:

- identificador persistente do item;
- descrição do item;
- quantidade correspondente a 1 PRDU;
- exercício de referência;
- escopo organizacional;
- identificação do documento importado;
- confirmação humana da importação.

## Fonte de estoque

O SISCOFIS deve alimentar o domínio de **Armazenagem**.

Contrato mínimo esperado:

- identificador persistente do item;
- descrição do item;
- quantidade existente;
- quantidade reservada;
- quantidade disponível;
- data da posição do estoque;
- escopo organizacional;
- identificação do documento importado.

A Situação Geral utiliza, por padrão, a quantidade **disponível** para o cálculo de cobertura, preservando existente e reservado para auditoria e análises posteriores.

## Correlação

A regra determinística de cobertura é:

`cobertura_PRDU = estoque_disponivel / quantidade_1_PRDU`

Também são derivados:

- déficit = `max(0, PRDU - disponível)`;
- superávit = `max(0, disponível - PRDU)`.

O alvo quantitativo da visão atual é `cobertura_PRDU >= 1`.

## Regra de identificação

Não correlacionar itens apenas por descrição textual.

A correlação deve usar identificador persistente, como NEE, CATMAT validado ou chave interna homologada. Quando não houver chave confiável, o sistema deve apresentar a correspondência proposta para confirmação humana.

## Ingestão

Formatos estruturados, quando disponíveis, devem ter prioridade sobre PDF:

1. XLSX/CSV;
2. JSON, se fornecido pelo sistema fonte;
3. PDF como alternativa.

A ingestão documental deve seguir:

`upload -> identificação da fonte -> extração -> prévia -> validação -> confirmação humana -> persistência -> projeção`

Nenhum parser documental deve ser considerado integrado enquanto não houver teste com arquivo real e critério de aceite comprovado.

## Estado atual desta implementação

A página de Situação Geral passa a usar como bloco principal um snapshot operacional de referência da Classe II, atualizado em 1 SET 26, com posição de estoque de 31 JUL e referência ePRDU 2027.

Este snapshot reproduz os índices de cobertura do controle semanal fornecido pelo usuário. Ele **não** é apresentado como sincronização automática com ePRDU ou SISCOFIS.

Os contratos de domínio para ePRDU e SISCOFIS já existem em `src/modules/logistics/prdu-siscofis.ts`.

Pendências deliberadas:

- parser real de arquivos ePRDU;
- parser real de arquivos SISCOFIS;
- persistência dos snapshots importados;
- mapeamento persistente de itens;
- substituição do snapshot de referência por projeção calculada a partir dos dois conjuntos importados.
