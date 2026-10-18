import type { MclChatRequest } from "@/modules/ai/contracts";

/**
 * Narrow, post-planner safety check for a documented NC/NE confusion.
 * Keeps the conversational object when the user clarifies a prior NC question.
 * This does not compute dates or replace the semantic LLM planner.
 */
export type NcQuestionKind = "VALIDITY" | "UNSPECIFIED_URGENCY" | null;

const normalize = (text: string) => text.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

const ncReference = /\b(?:ncs?|notas? de credito)\b/;
const neReference = /\b(?:nes?|notas? de empenho)\b/;
const deadline = /\b(?:validade|venciment\w*|expir\w*|menor(?:es)? prazo\w*|prazos?)\b/;
const explicitValidity = /\b(?:validade|venciment\w*|expir\w*|menor(?:es)? prazo\w*)\b/;
const urgency = /\b(?:urgent\w*|prioritari\w*)\b/;
const bareConfirmation = /^(?:sim|isso|exato|exatamente|correto|confirmo|confirmado|ja confirmei(?: que quero)?|ja confirmei que quero!)\s*[!.?]*$/;

/** Never reinterpret an explicit NE or delivery-deadline question as NC validity. */
export function resolveNcQuestion(input: MclChatRequest, plannedIntent: string): NcQuestionKind {
  const current = normalize(input.prompt);
  if ((neReference.test(current) && !ncReference.test(current))
    || /\b(?:prazo de entrega|prazo contratual|vigencia contratual)\b/.test(current)) return null;

  const recent = input.history.slice(-8);
  const hasNcContext = ncReference.test(current)
    || recent.some((message) => ncReference.test(normalize(message.content)));
  if (!hasNcContext) return null;

  const explicitNcUrgency = ncReference.test(current) && urgency.test(current);
  const priorUserDemandedDeadline = recent.some((message) =>
    message.role === "user" && explicitValidity.test(normalize(message.content)));
  const priorNcRequest = recent.some((message) =>
    message.role === "user" && ncReference.test(normalize(message.content)));

  if (plannedIntent === "nc_validity") return "VALIDITY";
  if (deadline.test(current) && (ncReference.test(current) || priorNcRequest
    || explicitValidity.test(current))) return "VALIDITY";
  if (bareConfirmation.test(current) && priorUserDemandedDeadline) return "VALIDITY";
  if (explicitNcUrgency) return priorUserDemandedDeadline || deadline.test(current)
    ? "VALIDITY" : "UNSPECIFIED_URGENCY";
  return null;
}
