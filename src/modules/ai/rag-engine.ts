// Compatibilidade de imports: os contratos públicos continuam neste caminho,
// mas o motor determinístico por palavras-chave foi removido.
export type { Citation, RagResponse } from "@/modules/ai/contracts";
export { retrieveMclKnowledge } from "@/modules/ai/knowledge-base";
