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
