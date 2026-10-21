# Robô TG automático, instalação, diagnóstico e aceite

## Status e responsabilidade

O arquivo [`robo-mcl-tg.gs`](./robo-mcl-tg.gs) é **código-fonte versionado**. Alterá-lo no GitHub ou publicar o Next.js na Vercel **NÃO atualiza o projeto Google Apps Script instalado**. Para operar de fato, a versão aprovada precisa ser instalada no projeto existente **Robô_MCL**, sem criar outro robô, sem substituir tokens e sem recriar gatilhos desnecessariamente.

A carga mestre de Créditos é o anexo **`MCL_MESTRE_CREDITOS_V2_TESTE.xlsx`** recebido por e-mail do SERPRO. O relatório `MCL_MESTRE_EXERCICIO_2026.xlsx` não é intercambiável no mesmo slot de dados TG V2 e não deve suplantá-lo silenciosamente. Fontes SAG/RPNP usam sua própria cadeia `siafi-mcl.gs`.

## Configuração do projeto instalado

1. Abrir o Google Apps Script **Robô_MCL existente**. Fazer uma cópia/backup do script instalado antes de alterar.
2. Inspecionar **Execuções** e **Acionadores** antes de substituir código; guardar horário e erro da última execução de `enviarPlanilhaSiafiParaMCL`.
3. Comparar o código instalado com este repositório e incorporar a versão aprovada de `robo-mcl-tg.gs`. Se o projeto contém outras funções, preservar e não substituir indiscriminadamente o arquivo inteiro.
4. Em **Configurações do projeto > Propriedades do script**, verificar, sem expor valores: `MCL_WEBHOOK_TOKEN` (mesmo segredo usado no servidor como `MCL_SIAFI_WEBHOOK_TOKEN`), `MCL_ORGANIZATION_CODE` (UASG vinculada à organização ativa) e, opcionalmente, `MCL_WEBHOOK_URL`.
5. Executar **`diagnosticarRoboMclTg`** e inspecionar o log sem segredo. Caso não exista acionador, executar uma vez **`instalarGatilhoMclTg`**. A rotina verifica a existência antes de criar, usando periodicidade horária.
6. Executar uma vez **`enviarPlanilhaSiafiParaMCL`**; conferir o log **`TG_PERSISTIDO`** com nome do arquivo, data do e-mail, linhas positivas, checksum e persistedAt. Se houver `TG_SYNC_FAILED`, usar status HTTP e log de bloco para localizar o ponto exato: 401 (segredo), 404 (vínculo UASG), 400/422 (contrato ou dado inválido), 5xx/429 (infra e limite). Não cadastrar outra credencial nem fazer upload manual para mascarar falha.
7. Conferir **automaticamente persistido** no módulo Créditos e no Assistente o mesmo checksum/nome de arquivo e novo horário de importação. Depois confirmar execução recorrente em dia posterior, sem atuação humana.

## Contrato e segurança

- O script considera a **última mensagem V2** entre as correspondências e usa a mesma chave `uploadId` para todos os blocos de no máximo 2 MB; envia até 20 MB.
- Repetição limitada e exponencial acontece apenas com erro de transporte, HTTP 429 ou 5xx; erros de autorização, schema ou UG inexistente abortam a execução, preservando o estado.
- Confirmação registrada em propriedades **somente após** resposta final da API com `success`, `checksum`, `rowCount>0` e `persistedAt`. Próxima execução sem nova mensagem é idempotente.
- A API deve validar `organizationCode`, token e integridade do arquivo e persistir por checksum. A carga TG é importada, não dado ao vivo; usar data do relatório e data de ingestão de forma distinta.
- Não há atualização silenciosa do projeto Apps Script a partir de um push no GitHub. É necessário verificar a **instalação** e o **gatilho real** no ambiente Google.

## Critérios de aceite

- Recebimento automático confirmado da planilha V2 mais recente, incluindo após 20/10/2026.
- Mesmo arquivo e novo timestamp reconhecidos pelo MCL após persistência, sem alterar registros financeiros manualmente.
- Execução recorrente do acionador comprovada.
- Erros persistentes deixam rastro e não são confundidos com sucesso.
- A suíte Vitest executa a fonte `.gs` em ambiente simulado para verificar os contratos; isso **não substitui** o teste no Apps Script real.

A recuperação automatizada e monitoramento permanecem rastreados no Linear **EDE-33**.