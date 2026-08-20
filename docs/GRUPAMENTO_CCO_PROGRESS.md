# MCL — Escalão / Grupamento Logístico — CCO

Status do lote: **EM IMPLEMENTAÇÃO — NÃO HOMOLOGADO**  
Branch: `feat/grupamento-cco`  
Data de abertura: 19 AGO 2026

## Objetivo da frente

Criar um nível próprio de Escalão / Grupamento Logístico para o MCL, orientado ao Centro de Coordenação de Operações do 9º Gpt Log, capaz de distribuir informação executiva em oito monitores e receber exportações manuais do SAG sem simular integração inexistente.

## Cadeia desta frente

SAG exportado manualmente → validação do arquivo → interpretação determinística → matriz Classes/PI importada → classificação auditável → consolidação por Classe/PI/UG → indicadores executivos → configuração das 8 saídas → tela fixa ou loop com delay configurável → exibição no CCO.

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
- [x] endpoint autenticado `POST /api/grupamento/regras` para planilha-algoritmo;
- [x] parser da tabela `Classes / PI` sem hardcode dos códigos no repositório público;
- [x] regra vazia ou `???` permanece `PENDENTE`, sem preenchimento por inferência;
- [x] detecção de PI atribuído a mais de um grupo;
- [x] classificação SAG por código PI exato;
- [x] `NOME_PI` não é usado para adivinhar código ausente;
- [x] deduplicação da mesma linha dentro do total de uma Classe quando houver sobreposição de grupos;
- [x] leitura das definições textuais `Slide N - ...` da planilha de regras;
- [x] modo de monitor `Execução por Classe`;
- [x] modo de monitor `Briefing` derivado das definições importadas;
- [x] matriz configurável de 8 monitores;
- [x] tela fixa ou loop por monitor;
- [x] delay independente por monitor;
- [x] rota de apresentação em tela cheia `/grupamento/monitor/1` até `/8`;
- [x] compartilhamento local da configuração e dos resumos importados entre telas do mesmo navegador por `localStorage`;
- [x] identificação visível da fonte, data de importação e natureza `DADO IMPORTADO`/`REGRA_IMPORTADA`;
- [x] recusa explícita de números fake quando não existe carga SAG;
- [x] testes unitários das fórmulas financeiras;
- [x] teste end-to-end do parser com workbook XLSX sintético;
- [x] testes da importação de regras, conflito e classificação por Classe.

## Fonte de regras recuperada

Foi localizado no Drive o arquivo de trabalho `algoritmo`, criado em 19 AGO 2026, contendo uma tabela explícita `Classes / PI` e blocos de definição de briefing. A implementação **não copia os códigos PI desse documento para o GitHub público**. O arquivo deve ser carregado no cockpit como `REGRA_IMPORTADA`, preservando atualização e permitindo substituir a matriz sem alterar código.

A fonte contém situações que exigem transparência, por exemplo PI repetido entre grupos e linha com `???`. O MCL registra conflito/pendência e não escolhe silenciosamente uma interpretação.

## Limite ainda aberto: RPNP / RP

Os arquivos de referência mostram blocos de Restos a Pagar com campos `INSCRITO`, `BLOQUEADO`, `A LIQ`, `EM LIQ`, `LIQ A PAGAR`, `PAGO` e `CANCELADO`. A fórmula institucional completa de consolidação dos percentuais de RPNP ainda não foi homologada no código. Portanto, a versão atual calcula exercício corrente e mantém RPNP como frente pendente, em vez de reaproveitar indevidamente a fórmula do exercício corrente.

## Escopo protegido

Este lote **não deve alterar**:

- OAuth Google;
- provedores de autenticação existentes;
- CATMAT / ARP;
- lógica de necessidades, aquisição, recebimento, armazenagem ou entrega fora do necessário para navegação até o CCO;
- esquema Prisma, enquanto o armazenamento local for suficiente para validar a experiência de oito monitores.

## Critério de aceite do lote

O lote só pode ser marcado como concluído quando:

1. `typecheck`, `lint`, testes e `build` passarem no head atual;
2. o preview abrir `/grupamento` com sessão autorizada;
3. um arquivo SAG real puder ser carregado e gerar números coerentes sem persistência silenciosa do bruto;
4. a matriz `algoritmo` puder ser carregada e gerar Classes/conflitos coerentes;
5. pelo menos duas saídas de monitor forem abertas simultaneamente e respeitarem configurações distintas;
6. alteração de delay/seleção no cockpit refletir nas telas abertas;
7. fonte e data permanecerem visíveis;
8. não houver regressão no login Google;
9. RPNP esteja implementado com contrato explícito ou permaneça claramente rotulado como pendente, sem cálculo falso.

## Progresso objetivo

- Arquitetura funcional: 95%
- Código do núcleo SAG — exercício corrente: 90%
- Matriz Classes/PI e classificação: 85%
- Cockpit 8 monitores: 90%
- Modo briefing por regras importadas: 75%
- RPNP / RP: 20% — schema de origem conhecido, fórmula ainda não homologada
- Testes: CI anterior verde; novo head aguardando execução
- Preview: aguardando validação do novo head
- Produção: 0% — branch permanece isolada e PR em draft
