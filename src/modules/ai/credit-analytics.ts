import type { MclAiActor, MclChatRequest, RagResponse } from "@/modules/ai/contracts";
import { queryTgCreditAnalytics, type CreditAnalyticsInput } from "@/modules/ai/silos";
import { prisma } from "@/server/db";

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
  // A qualificação contábil prevalece sobre o substantivo "empenho".
  if (/\b(?:a liquidar|nao liquidado|nao liquidados|sem liquidacao)\b/.test(turn)) return "TO_LIQUIDATE";
  if (/\b(?:pag[oa]s?|pagamento\w*|pagamos|paguei)\b/.test(turn)) return "PAID";
  if (/\b(?:liquidad[oa]s?|liquidou|liquidacao|liquidacoes|liquidamos|liquidaram|liquidada?)\b/.test(turn)) return "LIQUIDATED";
  if (/\b(?:disponivel|disponiveis|saldos?)\b/.test(turn)) return "AVAILABLE";
  if (/\b(?:provisao|provisionado|recebido)\b/.test(turn)) return "PROVISION";
  if (/\b(?:a empenhar|empenhad[oa]s?|empenhou|empenhos?)\b/.test(turn)) return "COMMITTED";
  return undefined;
}

type CreditPercentage = "PAID_OF_COMMITTED" | "TO_LIQUIDATE_OF_COMMITTED" | "LIQUIDATED_OF_COMMITTED";

const isPercentageQuestion = (turn: string) =>
  /\b(?:percentual|percentagem|porcentagem|porcento|percent)\b/.test(turn)
  || /\d+\s*%|\b(?:quantos?|qual)\b[^?]*%/.test(turn);

// Quando o usuário corrige "PERCENTUAL eu disse", considerar a pergunta
// imediatamente anterior e nunca reinterpretar a correção como valor absoluto.
const isPercentageCorrection = (turn: string) =>
  /^(?:o\s+)?(?:percentual|porcentagem|percentagem|em percentual|em porcentagem)(?:[!.,\s]*(?:eu disse|que eu pedi|por favor))?[!?.]*$/.test(turn)
  || /^(?:eu disse|pedi)\s+(?:o\s+)?(?:percentual|porcentagem|percentagem)[!?.]*$/.test(turn);

function extractPercentage(turn: string): CreditPercentage | undefined {
  if (!isPercentageQuestion(turn)) return undefined;
  if (/\b(?:a liquidar|nao liquidado|nao liquidados|sem liquidacao)\b/.test(turn)) return "TO_LIQUIDATE_OF_COMMITTED";
  if (/\b(?:pag[oa]s?|pagamento\w*|pagamos|paguei)\b/.test(turn)) return "PAID_OF_COMMITTED";
  if (/\b(?:liquidad[oa]s?|liquidou|liquidacao|liquidacoes|liquidamos|liquidaram)\b/.test(turn)) return "LIQUIDATED_OF_COMMITTED";
  return undefined;
}

const isAllUnitsReference = (turn: string) =>
  /\b(?:todas?\s+as?\s+(?:om|unidades|organizacoes)|todas?\s+(?:om|uasg)|todo\s+o\s+grupamento)\b/.test(turn);
const isOwnUnitReference = (turn: string) =>
  /\b(?:noss[ao]s?|minha|meu)\s+(?:om|unidade|organizacao)\b/.test(turn);

function latestUnitScope(turns: string[]) {
  for (let index = turns.length - 1; index >= Math.max(0, turns.length - 4); index--) {
    const current = normalize(turns[index]);
    if (isAllUnitsReference(current)) return { kind: "ALL" as const };
    const explicitUg = extractUg(current);
    if (explicitUg) return { kind: "EXPLICIT" as const, ug: explicitUg };
    if (isOwnUnitReference(current)) return { kind: "OWN" as const };
  }
  return { kind: "NONE" as const };
}

/** Perguntas analíticas devem chegar ao modelo, não receber um agregado fora de contexto. */
export function isOpenFinancialQuestion(input: MclChatRequest) {
  const current = normalize(input.prompt);
  return /\b(?:alertas?|riscos?|irregularidades?|preocupante|critic[oa]s?|recomend\w*|prioriz\w*|impacto|justific\w*|explic\w*|porque|motivos?|avali\w*)\b/.test(current)
    || /\bpor que\b/.test(current)
    || /\bdeve\b.*\b(?:alerta|risco)\b/.test(current);
}

function extractRpnpMetric(turn: string): CreditAnalyticsInput["metric"] | undefined {
  if (/\b(?:reinscreveu|reinscrit[oa]s?|reinscricao)\b/.test(turn)) return "RPNP_REINSCRIBED";
  if (/\b(?:inscreveu|inscrit[oa]s?|inscricao)\b/.test(turn)) return "RPNP_REGISTERED_TOTAL";
  if (/\b(?:cancelad[oa]s?|cancelou|cancelamento)\b/.test(turn)) return "RPNP_CANCELLED";
  if (/\b(?:a liquidar|nao liquidado)\b/.test(turn)) return "RPNP_TO_LIQUIDATE";
  if (/\b(?:liquidado a pagar|liquidados a pagar)\b/.test(turn)) return "RPNP_LIQUIDATED_TO_PAY";
  if (/\b(?:liquidad[oa]s?|liquidou)\b/.test(turn)) return "RPNP_LIQUIDATED";
  if (/\b(?:pag[oa]s?|pagou)\b/.test(turn)) return "RPNP_PAID";
  if (/\b(?:saldo a pagar|quanto.*a pagar)\b/.test(turn)) return "RPNP_PAYABLE";
  if (/\b(?:restos? a pagar|rpnp)\b/.test(turn)) return "RPNP_REGISTERED_TOTAL";
  return undefined;
}

function extractSearch(current: string) {
  const normalized = normalize(current).replace(/[?!.,;:]+$/g, "");
  const match = normalized.match(/\b(?:foi|foram)\s+empenhad[oa]s?\s+(.+?)(?:\s+este ano)?$/)
    ?? normalized.match(/\bempenhos?\s+(?:de|para)\s+(.+?)(?:\s+este ano)?$/);
  if (!match) return undefined;
  const candidate = match[1]
    .replace(/\b(?:na|no|pela|pelo)\s+nd\s+\d{2,8}\b/g, "")
    .replace(/\s+(?:em|nos?|d[eo]s?)\s+(?:rpnp|rp|restos? a pagar(?: nao processados?)?)$/g, "")
    .trim();
  return candidate && !/^(credito|valor|recurso|quanto)$/.test(candidate) ? candidate : undefined;
}

export type ResolvedCreditIntent = CreditAnalyticsInput & {
  ranking: boolean;
  percentage?: CreditPercentage;
  ownUnitContext?: boolean;
  percentageNeedsClarification?: boolean;
  answerable: boolean;
};

export function resolveCreditAnalyticsIntent(input: MclChatRequest): ResolvedCreditIntent {
  const turns = userTurns(input);
  const current = normalize(input.prompt);
  const ranking = /\b(?:mais caros?|maiores|ranking|top)\b/.test(current) && /\b(?:empenhos?|empenhad[oa]s?)\b/.test(current);
  const search = extractSearch(input.prompt);
  const rpnpSignal = turns.some((turn) => /\b(?:restos? a pagar|rpnp|reinscrit\w*)\b/.test(normalize(turn)));
  const isFollowUp = /\b(?:detalhe|detalhar|distribua|distribuicao|por uasg|por ug|por pi|por nd)\b/.test(current);
  const isCorrection = isPercentageCorrection(current);
  const previousUserQuestion = turns.at(-2);
  const percentage = extractPercentage(current)
    ?? (isCorrection && previousUserQuestion ? extractPercentage(normalize(previousUserQuestion)) : undefined)
    ?? (isFollowUp ? latestMatch(turns.slice(0, -1), extractPercentage) : undefined);
  const percentageNeedsClarification = (isPercentageQuestion(current) || isCorrection) && !percentage;
  // Percentual identificado tem prioridade sobre "total empenhado", que é
  // denominador, e não a métrica solicitada.
  const explicitMetric = rpnpSignal ? extractRpnpMetric(current) : extractMetric(current);
  const metric = percentage === "PAID_OF_COMMITTED" ? "PAID"
    : percentage === "TO_LIQUIDATE_OF_COMMITTED" ? "TO_LIQUIDATE"
    : percentage === "LIQUIDATED_OF_COMMITTED" ? "LIQUIDATED"
    : percentageNeedsClarification ? undefined
    : explicitMetric ?? (rpnpSignal ? latestMatch(turns.slice(0, -1), extractRpnpMetric) : latestMatch(turns.slice(0, -1), extractMetric));
  const unitScope = latestUnitScope(turns);
  const ug = unitScope.kind === "EXPLICIT" ? unitScope.ug : undefined;
  // Uma nova busca por objeto mantém a unidade da conversa, mas não herda
  // classificações contábeis antigas que o usuário não repetiu.
  const nd = search ? extractNd(current) : latestMatch(turns, extractNd);
  const pi = search ? extractPi(current) : latestMatch(turns, extractPi);
  const includeFinalities = /\b(?:finalidades?|destinacoes?|descricoes? das? ncs?)\b/.test(current);
  const groupBy = ranking || search
    ? "NE"
    : /\b(?:cada|por)\s+(?:ug|uasg|om|unidade)\b/.test(current)
        || /\b(?:todas? as? (?:om|unidades|organizacoes))\b/.test(current)
        || Boolean(ug && !/^\d{6}$/.test(ug))
      ? "UG"
      : "TOTAL";
  const financialSignal = turns.some((turn) => /\b(?:creditos?|provisao|empenh\w*|liquid\w*|pag\w*|saldo|nd|natureza de despesa|uasg|ug|restos? a pagar|rpnp|inscrit\w*|reinscrit\w*)\b/.test(normalize(turn)));
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
    percentage,
    ownUnitContext: unitScope.kind === "OWN",
    percentageNeedsClarification,
    answerable: (financialSignal || percentageNeedsClarification)
      && !isOpenFinancialQuestion(input)
      && Boolean(metric || percentage || ranking || search || nd || pi || includeFinalities || percentageNeedsClarification),
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
  RPNP_REGISTERED_TOTAL: "valor inscrito e reinscrito em restos a pagar não processados",
  RPNP_REGISTERED: "valor inscrito em restos a pagar não processados",
  RPNP_REINSCRIBED: "valor reinscrito em restos a pagar não processados",
  RPNP_CANCELLED: "valor cancelado de restos a pagar não processados",
  RPNP_TO_LIQUIDATE: "valor de restos a pagar não processados a liquidar",
  RPNP_LIQUIDATED: "valor liquidado de restos a pagar não processados",
  RPNP_LIQUIDATED_TO_PAY: "valor liquidado a pagar de restos a pagar não processados",
  RPNP_PAID: "valor pago de restos a pagar não processados",
  RPNP_PAYABLE: "saldo a pagar de restos a pagar não processados",
};

type CreditToolData = {
  source: { fileName: string; importedAt: string };
  filters: { ug: string | null; nd: string | null; pi: string | null; search: string | null; matchedUgs: Array<{ ug: string; om: string }> };
  metric: NonNullable<CreditAnalyticsInput["metric"]>;
  totals: { metricValueCents: number; neCount: number; ncCount: number; registeredCents?: number; reinscribedCents?: number;
    committedCents?: number; committedToLiquidateCents?: number; paidCents?: number; liquidatedCents?: number };
  groups: Array<{
    label: string;
    metricValueCents: number;
    committedCents?: number;
    committedToLiquidateCents?: number;
    paidCents?: number;
    liquidatedCents?: number;
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


  if (intent.percentage) {
    const denominator = data.totals.committedCents;
    const numerator = intent.percentage === "PAID_OF_COMMITTED" ? data.totals.paidCents
      : intent.percentage === "LIQUIDATED_OF_COMMITTED" ? data.totals.liquidatedCents
      : data.totals.committedToLiquidateCents;
    const numeratorLabel = intent.percentage === "PAID_OF_COMMITTED" ? "pago"
      : intent.percentage === "LIQUIDATED_OF_COMMITTED" ? "liquidado" : "a liquidar";
    if (denominator === undefined || numerator === undefined || denominator <= 0) {
      return "Não é possível calcular o percentual: os valores de empenhado e " + numeratorLabel +
        " não estão disponíveis com denominador positivo para este filtro. Nenhum percentual foi estimado.";
    }
    const percentage = (part: number, total: number) => new Intl.NumberFormat("pt-BR", {
      style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(part / total);
    const groupLines = data.groups.length > 1 ? data.groups.map((group) => {
      const base = group.committedCents;
      const value = intent.percentage === "PAID_OF_COMMITTED" ? group.paidCents
        : intent.percentage === "LIQUIDATED_OF_COMMITTED" ? group.liquidatedCents
        : group.committedToLiquidateCents;
      return base !== undefined && value !== undefined && base > 0
        ? `${group.label}: ${percentage(value, base)} (${currency(value)} de ${currency(base)} empenhados).`
        : `${group.label}: sem base positiva ou dados completos para calcular o percentual.`;
    }) : [];
    return [
      `Do total empenhado ${scope ? `em ${scope}` : "no conjunto consultado"}, ${percentage(numerator, denominator)} está ${numeratorLabel}.`,
      `Total empenhado: ${currency(denominator)}. Montante ${numeratorLabel}: ${currency(numerator)}.`,
      ...groupLines,
      `Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`,
    ].join("\n");
  }

  if (data.metric.startsWith("RPNP_") && data.filters.search && data.totals.neCount === 0) {
    return `Nenhum empenho de RPNP do escopo autorizado contém “${data.filters.search}” nos campos descritivos disponíveis. A ausência do termo não prova que o objeto nunca tenha sido adquirido sob outra descrição.`;
  }

  if (data.metric === "RPNP_REGISTERED_TOTAL") {
    return [
      `${data.filters.search ? "Sim. " : ""}O valor inscrito e reinscrito em restos a pagar não processados para ${scope || "o filtro informado"} soma ${currency(data.totals.metricValueCents)}.`,
      `Inscritos: ${currency(data.totals.registeredCents ?? 0)}. Reinscritos: ${currency(data.totals.reinscribedCents ?? 0)}.`,
      ...(data.groups.length > 1 || data.filters.search
        ? data.groups.map((group) => `${group.ne ?? group.label}: ${currency(group.metricValueCents)}, ${shortText(group.description)}.`)
        : []),
      `Fonte: ${data.source.fileName}, importada em ${new Date(data.source.importedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" })}.`,
    ].join("\n");
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

const financialResponse = (
  answer: string,
  requestId: string,
  citations: RagResponse["citations"] = [],
  warnings: string[] = [],
): RagResponse => ({
  answer,
  citations,
  suggestedQuestions: ["Detalhe esse resultado por UASG, ND ou PI.", "Mostre os empenhos de maior valor nesse filtro."],
  warnings,
  requestId,
  provider: "mcl-deterministic",
  model: "motor-analitico-financeiro-v2",
  authMode: "session-rbac",
});

/**
 * Consultas financeiras suportadas usam o motor contábil determinístico como
 * caminho principal. O Gateway permanece disponível para questões abertas.
 * Nunca agregar todas as UASG para responder "nossa OM" sem vínculo confirmado.
 */
export async function runCreditAnalyticsContingency(
  input: MclChatRequest,
  actor: MclAiActor,
  requestId: string,
  gatewayFailure?: string,
): Promise<RagResponse | null> {
  const intent = resolveCreditAnalyticsIntent(input);
  if (!intent.answerable) return null;
  if (intent.percentageNeedsClarification) {
    return financialResponse(
      "Entendi que você pediu um percentual, não um valor absoluto. Especifique se deseja a proporção liquidada, paga ou a liquidar em relação ao total empenhado. Nenhum total foi apresentado como percentual.",
      requestId,
    );
  }

  // O escopo confirmado na pergunta anterior acompanha seus desdobramentos;
  // jamais expandir automaticamente a pergunta da própria OM para todas as UG.
  if (intent.ownUnitContext && !intent.ug) {
    const organization = actor.organizationId
      ? await prisma.organization.findUnique({
          where: { id: actor.organizationId },
          select: { uasg: true },
        })
      : null;
    if (!organization?.uasg) {
      return financialResponse(
        "Não é possível determinar o saldo da sua OM: a organização do usuário não possui UASG vinculada e validada. Informe a UASG ou configure o vínculo organizacional. Nenhum total agregado foi apresentado como saldo da OM.",
        requestId,
        [],
        ["UASG da organização não identificada; consulta financeira não executada."],
      );
    }
    intent.ug = organization.uasg;
    intent.groupBy = "TOTAL";
  }

  const result = await queryTgCreditAnalytics(actor, intent);
  if (result.status !== "AVAILABLE") {
    return financialResponse(
      `Não foi possível obter um valor financeiro verificável: ${result.gaps.join(" ") || "projeção do Tesouro Gerencial indisponível."} Nenhum saldo foi estimado.`,
      requestId,
      result.citations,
      result.gaps,
    );
  }

  const data = result.data as CreditToolData;
  const importedAtMs = Date.parse(result.asOf);
  const outdated = Number.isFinite(importedAtMs) && Date.now() - importedAtMs > 24 * 60 * 60 * 1000;
  const asksForCurrent = /\b(?:hoje|agora|atual|atualmente)\b/.test(normalize(input.prompt));
  const freshnessWarning = outdated
    ? "A carga financeira tem mais de 24 horas. O valor é histórico e não foi validado como saldo atual."
    : undefined;
  const baseAnswer = formatCreditAnalyticsAnswer(data, intent);
  const answer = asksForCurrent && outdated
    ? `${baseAnswer}\nAtenção: esta é a última posição importada, não uma consulta ao saldo de hoje.`
    : baseAnswer;
  return financialResponse(answer, requestId, result.citations, [
    ...(gatewayFailure
      ? [`O modelo de linguagem ficou indisponível (${gatewayFailure}); a resposta foi concluída pelo motor analítico auditável do MCL.`]
      : []),
    ...(freshnessWarning ? [freshnessWarning] : []),
    ...result.gaps,
  ]);
}
