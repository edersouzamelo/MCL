# Mapeamento e Correlação CATMAT

O MCL realiza mapeamentos inteligentes de candidatos do catálogo público de materiais do governo (CATMAT) para os itens internos cadastrados no MCL.

## Regras de Mapeamento
* **Sem ranqueamento LLM:** A similaridade textual é calculada de forma determinística dividindo os tokens coincidentes pelos tokens totais da busca.
* **Mapeamento Humano Obrigatório:** O MCL nunca classifica um item público de forma automática. Um usuário autorizado (`LOGISTICS_MANAGER` ou `ADMIN`) deve justificar a correlação e clicar em Confirmar.
* **Mapeamento Único por Contexto:** Apenas um mapeamento pode estar ativo (`ACTIVE`) para cada necessidade. Confirmar um novo mapeamento altera automaticamente o status do anterior para `SUPERSEDED`.
* **Histórico Preservado:** Ações de revogação não apagam os registros, apenas alteram o status para `REVOKED` e gravam quem revogou, o horário e o motivo da ação para fins de auditoria.
