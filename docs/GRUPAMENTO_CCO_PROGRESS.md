# MCL — Escalão / Grupamento Logístico — CCO

Status do lote: **EM IMPLEMENTAÇÃO — NÃO HOMOLOGADO**  
Branch: `feat/grupamento-cco`  
Data de abertura: 19 AGO 2026

## Objetivo da frente

Criar um nível próprio de Escalão / Grupamento Logístico para o MCL, orientado ao Centro de Coordenação de Operações do 9º Gpt Log, capaz de distribuir informação executiva em oito monitores e receber exportações manuais do SAG sem simular integração inexistente.

## Cadeia desta frente

SAG exportado manualmente → validação do arquivo → interpretação determinística → consolidação por PI/UG → indicadores executivos → configuração das 8 saídas → tela fixa ou loop com delay configurável → exibição no CCO.

## Implementado neste checkpoint

- [x] branch isolada da frente de Grupamento;
- [x] rota `/grupamento` protegida por perfil demonstrativo de comando/gestão;
- [x] entrada no menu `Escalão / CCO`;
- [x] endpoint autenticado `POST /api/grupamento/sag`;
- [x] leitura `.xls` e `.xlsx` com `xlsx` já presente no projeto;
- [x] reconhecimento dos campos SAG `DISPONIVEL`, `A_LIQUIDAR`, `EM_LIQUIDACAO`, `LIQUIDADO`, `PAGO`, `%EMP`/`%EMPENHADO` e `%LIQ`/`%LIQUIDADO`;
- [x] leitura opcional de `UG`, `SIGLA`/`T_SIGLA`, `PI`, `NOME_PI`, `ND` e `NOME_ND`;
- [x] cálculo próprio e auditável de percentual empenhado e liquidado;
- [x] comparação com percentuais reportados para sinalizar divergência;
- [x] consolidação por PI e por UG;
- [x] arquivo bruto não persistido pelo endpoint;
- [x] registro de auditoria da tentativa de carga;
- [x] matriz configurável de 8 monitores;
- [x] tela fixa ou loop por monitor;
- [x] delay independente por monitor;
- [x] rota de apresentação em tela cheia `/grupamento/monitor/1` até `/8`;
- [x] compartilhamento local da configuração e do resumo importado entre as telas do mesmo navegador por `localStorage`;
- [x] identificação visível da fonte, data de importação e natureza `DADO IMPORTADO`;
- [x] recusa explícita de números fake quando não existe carga SAG;
- [x] teste unitário das fórmulas financeiras básicas.

## Regra deliberadamente NÃO inventada

A associação **PI → Classe de Suprimento** ainda não está codificada porque a matriz institucional correspondente não foi recuperada como regra explícita. O sistema mantém o detalhamento por PI e UG e marca o agrupamento por Classe como pendente, em vez de inferir silenciosamente.

Quando a matriz for definida, ela deverá ser versionada e testada antes de liberar o quadro de execução por Classe.

## Escopo protegido

Este lote **não deve alterar**:

- OAuth Google;
- provedores de autenticação existentes;
- CATMAT / ARP;
- lógica de necessidades, aquisição, recebimento, armazenagem ou entrega fora do necessário para navegação até o CCO;
- esquema Prisma, enquanto o armazenamento local for suficiente para validar a experiência de oito monitores.

## Critério de aceite do lote

O lote só pode ser marcado como concluído quando:

1. `typecheck`, `lint`, testes e `build` passarem;
2. o preview abrir `/grupamento` com sessão autorizada;
3. um arquivo SAG real puder ser carregado e gerar números coerentes sem persistência silenciosa do bruto;
4. pelo menos duas saídas de monitor forem abertas simultaneamente e respeitarem configurações distintas;
5. alteração de delay/seleção no cockpit refletir nas telas abertas;
6. fonte e data permanecerem visíveis;
7. não houver regressão no login Google;
8. a matriz PI → Classe estiver explicitamente definida **ou** o quadro por Classe permanecer desabilitado e rotulado como pendente.

## Progresso objetivo

- Arquitetura funcional: 90%
- Código do núcleo SAG: 80%
- Cockpit 8 monitores: 80%
- Agrupamento PI → Classe: 0% — aguardando regra explícita
- Testes/build/preview: 0% neste checkpoint
- Produção: 0% — branch ainda não integrada
