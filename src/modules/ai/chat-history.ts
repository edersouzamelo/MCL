/**
 * Compatibiliza o histórico conversacional com o contrato de /api/ai/chat.
 * Respostas extensas permanecem visíveis integralmente na interface, mas não
 * devem ser reenviadas como transcrições de milhares de registros contábeis.
 *
 * Isto NÃO substitui a consulta aos documentos originais em uma nova análise.
 */
export type HistorySourceMessage = {
  sender: "user" | "assistant";
  text: string;
  errorCode?: string;
};

export type BoundedChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const AI_HISTORY_MESSAGE_LIMIT = 4_000;
export const AI_HISTORY_MAX_MESSAGES = 8;
const KEEP_HEAD_CHARS = 2_600;
const KEEP_TAIL_CHARS = 700;
const OMISSION = "\n[Resposta extensa abreviada apenas no histórico. Para analisar os registros, consulte novamente a fonte estruturada; o texto omitido não está disponível neste contexto.]\n";

function compactHistoryContent(message: HistorySourceMessage): string {
  const content = message.text.trim();
  if (content.length <= AI_HISTORY_MESSAGE_LIMIT) return content;
  if (message.sender === "user") {
    // Perguntas anteriores foram validadas no envio. Nunca alterar silenciosamente
    // uma mensagem livre do usuário para fazê-la parecer outra pergunta.
    return content.slice(0, AI_HISTORY_MESSAGE_LIMIT);
  }
  return content.slice(0, KEEP_HEAD_CHARS) + OMISSION + content.slice(-KEEP_TAIL_CHARS);
}

export function buildBoundedMclHistory(
  messages: readonly HistorySourceMessage[],
): BoundedChatMessage[] {
  return messages
    .filter((message) => !message.errorCode && message.text.trim().length > 0)
    .slice(-AI_HISTORY_MAX_MESSAGES)
    .map((message) => ({
      role: message.sender,
      content: compactHistoryContent(message),
    }));
}
