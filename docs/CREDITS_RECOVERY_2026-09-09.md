# Recuperação de Créditos — 9 SET 2026

Regressão: dbbfe5a substituiu indevidamente o dashboard da UASG por SAG/CCO.
A remoção dos dados fictícios não autorizava essa mudança de arquitetura.

## Fronteiras obrigatórias

- Créditos UASG: Tesouro Gerencial → subscrição de e-mail → Apps Script → persistência própria → painel inspirado no Power BI do Mendes.
- Escalão/CCO: ETL SAG → execução por classes → monitores.
- Preservar a fonte própria e a seção de RPNP; não migrá-las para SAG por conveniência.
- Não inventar valores, NCs, NEs, metas, fornecedores, volume ou sincronizações.

## Recuperação urgente

Layout e dez telas recuperados de c6fb455, com menus Requisitante, RPCM e Metas, colunas, pesquisa, filtros UG/ND, tema claro/escuro e guia. Removidos geradores, totais literais, metas fabricadas, multiplicação artificial de saldo RPCM e sincronização com temporizador. Campos sem fonte mostram ausência, sem saldo zero presumido.

O endpoint Créditos é autenticado e declara TG_SOURCE_RECONNECTION_PENDING. Não lê SAG. O Assistente também separa os silos. Não foram alterados parser, persistência ou monitores do CCO, nem configurações de OAuth.

## Limitação operacional, não concluída

Esta recuperação restaura apresentação e separação de domínio; não reconecta os saldos. As seções permanecem sem registros até homologação da fonte. Os arrays vazios no componente representam essa indisponibilidade, não um dataset financeiro. Não chamar este lote de recuperação operacional completa.

O parser antigo inferia colunas e preenchia UG/PI/ND/favorecido/ano ausentes, além de usar Math.abs. Não deve ser restaurado. O manual antigo menciona MCL_MESTRE_EXERCICIO_2026 e colunas UG Executora, PI, NE CCor, ano, favorecido, natureza e Movim. Líquido. Esse contrato não comprova NC disponível nem suas contas contábeis. É necessário localizar o Apps Script já instalado e os anexos TG reais antes de mapear saldos.

O webhook /api/connectors/siafi/upload e o script versionado pela PR20 ainda usam parser SAG: NÃO homologados como ingestão TG. Permanecem pendentes de reconciliação com a automação original. Não executar/instalar esse script como solução para Créditos. Não apagar lotes RPNP existentes.

Próxima etapa: recuperar script original, conferir gatilho e última execução, assunto da subscrição, destino, exemplos dos relatórios de cada seção; implementar persistência TG segregada; reconciliar saldos/NC/NE/PI com a fonte; conectar UI e Assistente ao mesmo serviço TG; comprovar atualização por ingestão real.


## Continuação — 10 SET 2026

Código do Robô_MCL original confirmado por captura do usuário: GmailApp.search MCL_MESTRE_EXERCICIO_2026, upload multipart somente file, sem Authorization. O webhook alterado exigia Bearer, organizationCode/sourceKind e interpretava SAG. O reparo adiciona reportType=TG_MASTER_V1 ao MESMO endpoint, com parser TG separado; preserva os caminhos SAG existentes e seus lotes CURRENT/RPNP.

Implementado: leitura estrita de todas as abas do relatório mestre; propagação apenas de mesclas reais; valores em centavos com sinais; persistência por organização+TG_MASTER_V1+checksum; reenvio sem atualização artificial da data; consulta autenticada; validação/confirmacão manual por ADMIN/LOGISTICS_MANAGER; consulta do relatório original no painel, com busca/paginação; Assistente consulta a mesma fonte e expõe lacunas. Robô corrigido em integrations/apps-script/robo-mcl-tg.gs preserva o nome da função/gatilho e não toca em mensagens nem na fonte RPNP.

Evidência: arquivo mestre real no Drive, versão de 17 AGO (não apresentado como atual): 2.517 registros em 160136, 160142 e 160513, incluindo 75 valores negativos. Arquivo privado não incluído no git. Parser testado com esse arquivo. Build concluído. Não há evidência de execução automática em produção nem de importação desse arquivo no banco operacional nesta etapa.

A recuperação integral permanece ABERTA: o mestre não identifica Item Informação, NC, metas, Requisitante/RPCM nem saldos próprios RPNP. Não converter Movim. Líquido para esses campos. Os dez layouts permanecem, mas suas métricas continuam sem fonte comprovada. As APIs legadas de KPIs/empenhos ainda não foram homologadas. Próximos requisitos concretos: aplicar script no projeto existente, configurar suas propriedades com o segredo do servidor/código da organização e verificar execução; obter a seleção de Itens Informação do TG e fontes específicas das visões. Não restaurar percentuais, NCs ou registros gerados do store antigo.

## Auditoria do Power BI e do fluxo — 10 SET 2026

As dez páginas do Power BI público do Mendes foram percorridas e seus indicadores, colunas e relações foram registrados em `docs/CREDITS_ACCOUNTING_CONTRACT.md`. As relações de crédito disponível, empenhado a liquidar e RPNP a liquidar foram reconciliadas numericamente com os valores exibidos. Essas relações estão implementadas em funções puras testadas; não dependem de percentuais fixos.

O Gmail confirma 16 entregas reais do SERPRO com o assunto `MCL_MESTRE_EXERCICIO_2026`, entre 17 AGO e 10 SET 2026. Foi identificado um bloqueio no robô: ele reprocessava até 14 dias em ordem crescente, podendo atingir o limite do Apps Script antes de enviar o snapshot mais recente. O script agora seleciona primeiro o e-mail mais novo e encerra após uma persistência confirmada.

Também foi identificada inconsistência de autenticação: `/creditos` não estava no `matcher` do middleware, embora `/api/creditos` exija sessão. Assim, a página podia abrir com a moldura demonstrativa enquanto a consulta retornava HTTP 401. A rota foi incluída na proteção.

O parser V2 do mesmo contrato recompõe PI/NE suprimidos pelo formato hierárquico do TG, reinicia NE ao mudar de PI, preserva sinais e marca cada linha como resumo de PI ou detalhe de NE. Cargas V1 já persistidas não são reinterpretadas; precisam ser reenviadas para reprocessamento verificável.

## Homologação do contrato V2 — 11 SET 2026

A exportação final `MCL_MESTRE_CREDITOS_V2_TESTE (2).xlsx` foi validada com 36.773 registros e 50 colunas. O contrato tornou explícitos UG Executora, PI, Ação Governo, Fonte Recursos, UGR-Gestão, PTRES, Item Informação, ND, NE, NC, RO, Documento e Movim. Líquido. Os Itens Informação homologados são 15, 16, 19, 29, 30, 31, 32, 34, 40–47 e 91.

Mapeamento: 91 provisão atualizada; 19 crédito disponível; 29 empenhado; 30 empenhado a liquidar; 31 liquidado; 32 liquidado a pagar; 34 pago; 40/41 inscrito e reinscrito; 42 cancelado; 43 a liquidar; 44 liquidado; 45 liquidado a pagar; 46 pago; 47 a pagar. Os códigos 15 e 16 preservam provisões recebida e concedida. `Doc - Valor` é somente documental e não participa dos indicadores.

A visão padrão é macro da Grande Unidade e mantém todas as UGs administrativas, inclusive as que não realizam novos empenhos. UG Executora não equivale a OM beneficiária/requisitante: OMDS sem autonomia podem executar por UG central, e essa classificação depende de dado próprio do MCL/SAG.

A assinatura do relatório antigo não é atualizada automaticamente. É obrigatório criar/alterar a inscrição diária do relatório V2 definitivo no TG, manter assunto compatível com o Robô_MCL e validar ao menos uma entrega antes de desativar a assinatura anterior.
