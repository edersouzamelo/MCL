# Camada Cognitiva

O Assistente IA usa um LLM real pelo Vercel AI Gateway, RAG versionado e ferramentas MCL somente leitura. A arquitetura detalhada está em `docs/ASSISTANT_AI.md`.

Os contratos históricos permanecem em `src/modules/cognitive/contracts.ts`; os contratos executáveis do Assistente ficam em `src/modules/ai`. A camada explicativa deve sempre:

- autenticar o usuário e aplicar escopo organizacional;
- usar dados autorizados;
- declarar fontes, datas, natureza, premissas e lacunas;
- excluir dados sintéticos de respostas operacionais;
- não inventar dados, códigos, datas, percentuais ou sincronizações;
- não criar pesos ou confiança sem método calibrado;
- não alterar registro oficial;
- não decidir;
- falhar explicitamente quando o provedor ou a fonte não estiver disponível.

O modelo não acessa o banco diretamente. Todas as consultas passam por ferramentas tipadas e limitadas. Créditos/TG e SAG/Grupamento permanecem bloqueados até cumprirem os critérios de integridade e persistência server-side documentados em `docs/ASSISTANT_AI.md`.
