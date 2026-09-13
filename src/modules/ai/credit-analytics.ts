import type { MclAiActor, MclChatRequest, RagResponse } from "@/modules/ai/contracts";
import { queryTgCreditAnalytics, type CreditAnalyticsInput } from "@/modules/ai/silos";

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/\s+/g, " ")
  .trim();

const userTurns = (input: MclChatRequest) => [
  ...input.history.filter((message) => message.role === "user").map((message) => message.content),
  input.prompt,
];

function latestMatch<T>(turns: string[], extract: (turn: string) => T | undefined) {
  for (let index = turns.length - 1; index >= 0; index--) {
    const result = extract(normalize(turns[index]));
    if (result !== undefined) return result;
  }
  return undefined;
}

function extractUg(turn: string) {
  const code = turn.match(/\b(1\d{5})\b/)?.[1];
  if (code) return code;
  if (/\b(?:9\s*)?(?:b\s*sup|bsup|batalhao de suprimento)\b/.test(turn)) return "9 BSUP";
  if (/\b(?:9\s*)?(?:gpt\s*log|grupamento logistico)\b/.test(turn)) return "9 Gpt Log";
  if (/\b(?:9\s*)?(?:b\s*mnt|bmnt|batalhao de manutencao)\b/.test(turn)) return "9 B Mnt";
  return undefined;
}

function extractNd(turn: string) {
  const explicit = turn.match(/\b(?:nd|natureza(?: de despesa)?)\s*(?:n[ºo.]?\s*)?(\d{2,8})\b/)?.[1];
  if (explicit) return explicit;
  return turn.match(/\b(3390(?:30|39)(?:\d{2})?)\b/)?.[1];
}

function extractPi(turn: string) {
  return turn.match(/\bpi\s+(?:n[ºo.]?\s*)?([a-z0-9][a-z0-9.-]{1,30})\b/)?.[1]?.toUpperCase();
}

function extractMetric(turn: string): CreditAnalyticsInput["metric"] | undefined {
  if (/\b(?:disponivel|saldo disponivel|credito disponivel)\b/.test(turn)) return "AVAILABLE";
  if (/\b(?:provisao|provisionado|recebido)\b/.test(turn)) return "PROVISION";
  if (/\b(?:a empenhar|empenhad[oa]s?|empenhou|empenhos?)\b/.test(turn)) return "COMMITTED";
  if (/\b(?:a liquidar|nao liquidado)\b/.test(turn)) return "TO_LIQUIDATE";
  if (/\b(?:liquidad[oa]s?|liquidou)\b/.test(turn)) return "LIQUIDATED";
  if (/\b(?:pag[oa]s?|pagou)\b/.test(turn)) return "PAID";
  return undefined;
}

function extractSearch(current: string) {
  const normalized = normalize(current).replace(/[?!.,;:]+$/g, "");
  const match = normalized.match(/\b(?:foi|foram)\s+empenhad[oa]s?\s+(.+?)(?:\s+este ano)?$/)
    ?? normalized.match(/\bempenhos?\s+(?:de|para)\s+(.+?)(?:\s+este ano)?$/);
  if (!match) return undefined;
  const candidate = match[1].replace(/\b(?:na|no|pela|pelo)\s+nd\s+\d{2,8}\b/g, "").trim();
  return candidate && !/^(credito|valor|recurso|quanto)$/.test(candidate) ? candidate : undefined;
}

export type ResolvedCreditIntent = CreditAnalyticsInput & {
  ranking: boolean;
  answerable: boolean;
};

export function resolveCreditAnalyticsIntent(input: MclChatRequest): ResolvedCreditIntent {
  const turns = userTurns(input);
  const current = normalize(input.prompt);
  const ranking = /\b(?:mais caros?|maiores|ranking|top)\b/.test(current) && /\b(?:empenhos?|empenhad[oa]s?)\b/.test(current);
  const search = extractSearch(input.prompt);
  const metric = latestMatch(turns, extractMetric);
  const ug = latestMatch(turns, extractUg);
  const nd = latestMatch(turns, extractNd);
  const pi = latestMatch(turns, extractPi);
  const includeFinalities = /\b(?:finalidades?|destinacoes?|descricoes? das? ncs?)\b/.test(current);
  const groupBy = ranking || search
    ? "NE"
    : /\b(?:cada|por)\s+(?:ug|uasg)\b/.test(current) || Boolean(ug && !/^\d{6}$/.test(ug))
      ? "UG"
      : "TOTAL";
  const financialSignal = turns.some((turn) => /\b(?:creditos?|provisao|empenh\w*|liquid\w*|pag\w*|saldo|nd|natureza de despesa|uasg|ug)\b/.test(normalize(turn)));
  return {
    ug,
    nd,
    pi,
    search,
    metric: metric ?? "AVAILABLE",
    groupBy,
    sort: ranking ? "VALUE_DESC" : undefined,
    includeFinalities,
    limit: ranking ? 10 : 20,
    ranking,
    answerable: financialSignal && Boolean(metric || ranking || search || nd || pi),
  };
}

const currency = (cents: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(cents / 100);

const shortText = (value: string | undefined, limit = 150) => {
  const compact = value?.replace(/\s+/g, " ").trim() || "sem descrição";
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1).trimEnd()}…`;
};

const metricLabel: Record<NonNullable<CreditAnalyticsInput["metric"]>, string> = {
  AVAILABLE: "crédito disponível",
  PROVISION: "provisão atualizada",
  COMMITTED: "valor empenhado",
  LIQUIDATED: "valor liquidado",
  TO_LIQUIDATE: "valor empenhado a liquidar",
  PAID: "valor pago",
};

type CreditToolData = {
  source: { fileName: string; importedAt: string };
  filters: { ug: string | null; nd: string | null; pi: string | null; search: string | null; matchedUgs: Array<{ ug: string; om: string }> };
  metric: NonNullable<CreditAnalyticsInput["metric"]>;
  totals: { metricValueCents: number; neCount: number; ncCount: number };
  groups: Array<{
    label: string;
    metricValueCents: number;
    ug?: string;
    ne?: string;
    supplier?: string;
    nd?: string;
    description?: string;
  }>;
  finalities: Array<{ purpose: string; provisionUpdatedCents: number; ncCount: number; nd: string; pi: string }>;
};

export function formatCreditAnalyticsAnswer(data: CreditToolData, intent: ResolvedCreditIntent) {
  const label = metricLabel[data.metric];
  const scope = [
    data.filters.ug ? `UG/UASG ${data.filters.ug}` : null,
    data.filters.nd ? `ND ${data.filters.nd}` : null,
    data.filters.pi ? `PI ${data.filters.pi}` : null,
    data.filters.search ? `busca “${data.filters.search}”` : null,
  ].filter(Boolean).join(", ");

  if (data.filters.ug && data.filters.matchedUgs.length === 0) {
    return `Nenhuma UASG corresponde ao filtro “${data.filters.ug}”. Não foi apresentado R$ 0,00 porque ausência de correspondência não equivale a saldo zero.`;
  }

  if ((data.filters.nd || data.filters.pi) && data.totals.ncCount === 0 && data.totals.neCount === 0) {
    return `Nenhum movimento contábil corresponde a ${scope}. Não foi apresentado R$ 0,00 porque o filtro não encontrou registros.`;
  }

  if (intent.includeFinalities && data.finalities.length) {
    return [
      `As finalidades registradas nas NCs para ${scope || "o filtro informado"} são:`,
      ...data.finalities.slice(0, 8).map((item) => `${item.purpose}, ${currency(item.provisionUpdatedCents)} provisionados, ND ${item.nd}, PI ${item.pi}, ${item.ncCount} NC(s).`),
      "Essas finalidades descrevem a provisão recebida e não rateiam o saldo disponível remanescente.",
      `Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`,
    ].join("\n");
  }

  if (intent.ranking) {
    if (!data.groups.length) return `Não foram encontrados empenhos para ${scope || "o filtro informado"}.`;
    return [
      `Os empenhos de maior valor para ${scope || "o filtro informado"} são:`,
      ...data.groups.slice(0, 8).map((group, index) => `${index + 1}. ${group.ne ?? group.label}, ${currency(group.metricValueCents)}, ${shortText(group.supplier, 70)}, ND ${group.nd ?? "não informada"}, ${shortText(group.description)}.`),
      `Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`,
    ].join("\n");
  }

  if (data.filters.search) {
    const prefix = data.totals.metricValueCents > 0 ? "Sim." : "Não foi localizado valor.";
    const records = data.groups.slice(0, 5).map((group) => `${group.ne ?? group.label}: ${currency(group.metricValueCents)}, ${shortText(group.description)}.`);
    return [
      `${prefix} O ${label} associado a ${scope} soma ${currency(data.totals.metricValueCents)} em ${data.totals.neCount} empenho(s) do exercício corrente.`,
      ...records,
      ...(data.totals.neCount === 0 ? ["A ausência do termo na descrição da NE não prova, isoladamente, que o objeto nunca tenha sido adquirido sob outra descrição."] : []),
      `Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`,
    ].join("\n");
  }

  if (data.groups.length > 1) {
    return [
      `O ${label} para ${scope || "o filtro informado"} soma ${currency(data.totals.metricValueCents)}.`,
      ...data.groups.map((group) => `${group.label}: ${currency(group.metricValueCents)}.`),
      `Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`,
    ].join("\n");
  }

  return `O ${label} para ${scope || "o filtro informado"} é ${currency(data.totals.metricValueCents)}. Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`;
}

export async function runCreditAnalyticsContingency(
  input: MclChatRequest,
  actor: MclAiActor,
  requestId: string,
  gatewayFailure: string,
): Promise<RagResponse | null> {
  const intent = resolveCreditAnalyticsIntent(input);
  if (!intent.answerable) return null;
  const result = await queryTgCreditAnalytics(actor, intent);
  if (result.status !== "AVAILABLE") return null;
  const data = result.data as CreditToolData;
  return {
    answer: formatCreditAnalyticsAnswer(data, intent),
    citations: result.citations,
    suggestedQuestions: ["Detalhe esse resultado por UASG, ND ou PI.", "Mostre os empenhos de maior valor nesse filtro."],
    warnings: [
      `O modelo de linguagem ficou indisponível (${gatewayFailure}); a resposta foi concluída pelo motor analítico auditável do MCL.`,
      ...result.gaps,
    ],
    requestId,
    provider: "mcl-deterministic",
    model: "motor-analitico-financeiro-v2",
    authMode: "session-rbac",
  };
}
