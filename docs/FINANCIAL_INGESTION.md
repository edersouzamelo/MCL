# RETIFICAÇÃO — 9 SET 2026

Este documento registrava uma associação incorreta entre TG e SAG. O script/webhook abaixo usa parsers SAG e NÃO está homologado para o dashboard de Créditos da UASG. Não instalar esse script como reparo de TG. Créditos e CCO são independentes. Ver CREDITS_RECOVERY_2026-09-09.md. O conteúdo abaixo é histórico, não uma instrução operacional vigente.

# Ingestão financeira SAG/Tesouro Gerencial

## Fonte de verdade

O MCL não consulta diretamente o SIAFI nem o Tesouro Gerencial. A fonte operacional é o arquivo XLS/XLSX ou PDF exportado/assinado pelo Tesouro Gerencial e validado pelos parsers SAG.

Cada importação aceita é persistida em `FinancialSourceImport` com organização, tipo (`CURRENT` ou `RPNP`), nome, SHA-256, contagem de linhas, método e horário do servidor. Ausência de carga produz estado vazio; nunca ativa dados demonstrativos.

## Fluxos aceitos

1. Manual: usuário `ADMIN` ou `LOGISTICS_MANAGER` envia o par em `/grupamento`.
2. Automático: o Apps Script versionado em `integrations/apps-script/siafi-mcl.gs` envia cada anexo ao webhook.

## Configuração do Apps Script

Nas Propriedades do script, definir:

- `MCL_WEBHOOK_URL`: `https://mcl-one.vercel.app/api/connectors/siafi/upload`
- `MCL_WEBHOOK_TOKEN`: mesmo valor de `MCL_SIAFI_WEBHOOK_TOKEN` na Vercel
- `MCL_ORGANIZATION_CODE`: código exato da organização no banco

Executar uma vez `installHourlyMclTrigger()`. O trigger verifica e-mails marcados `[SIAFI-MCL]` a cada hora. Uma mensagem só recebe o rótulo `MCL_SIAFI_PROCESSADO` depois de o MCL confirmar `checksum` e `persistedAt`. Falhas recebem `MCL_SIAFI_ERRO`.

## Critério de sucesso

- webhook retorna HTTP 2xx, `success: true`, `checksum` e `persistedAt`;
- `/api/connectors/siafi/sync` mostra `READY` ou `PARTIAL` com arquivos reais;
- `/creditos`, `/grupamento` e Assistente consultam o mesmo snapshot;
- nenhuma data de atualização é calculada no momento da leitura.
