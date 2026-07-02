# Camada Cognitiva

LLM, RAG e MCP não são dependências obrigatórias da v0.1.0.

Contratos somente leitura ficam em `src/modules/cognitive/contracts.ts`. Uma futura camada explicativa deve:

- usar dados autorizados;
- declarar fontes, premissas e lacunas;
- não inventar dados;
- não criar pesos;
- não alterar registro oficial;
- não decidir.
