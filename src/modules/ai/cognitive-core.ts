import { createHash } from "node:crypto";
import { gateway, generateText, Output } from "ai";
import { MclAiServiceError } from "@/modules/ai/contracts";
import type { MclAiActor, MclChatRequest, RagResponse } from "@/modules/ai/contracts";
import {
  type ResolvedCreditIntent,
  formatCreditAnalyticsAnswer,
  resolveCreditAnalyticsIntent,
} from "@/modules/ai/credit-analytics";
import { resolveMclModel } from "@/modules/ai/provider";
import { queryTgCreditAnalytics, type CreditAnalyticsInput } from "@/modules/ai/silos";
import { prisma } from "@/server/db";
import { aiSemanticPlanSchema, findSemanticCapability, semanticCatalogueForModel, type AiSemanticPlan } from "@/modules/ai/semantic-registry";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const percent = (part: number, total: number) => new Intl.NumberFormat("pt-BR", {
  style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(part / total);
const fmtDate = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" });

const instructions = [
  "Você é o planejador semântico do MCL, não é o redator da resposta. Interprete a pergunta e o histórico como uma conversa normal.",
  "Responda apenas o OBJETO ESTRUTURADO solicitado. Não invente dados ou valores; as ferramentas farão os cálculos.",
  "Escolha capability=credits-tg para dados de Crédito/Tesouro Gerencial e other para domínios não cadastrados.",
  "Uma pergunta de percentual é intent=ratio, metric=NUMERADOR e denominator=DENOMINADOR. Exemplo: liquidação do total empenhado significa LIQUIDATED/COMMITTED.",
  "Quando o usuário pede COMPARAR duas ou mais medidas (empenhado, liquidado, pago etc.), use intent=compare e preencha metrics com TODAS as medidas solicitadas, na ordem pedida; metric pode ser null. Exemplo: comparar empenhado, liquidado e pago: metrics=[COMMITTED,LIQUIDATED,PAID]. Não peça qual medida consultar.",
  "Para breakdown por UASG/UG, use intent=breakdown e groupBy=UG, preservando a medida mencionada ou discutida (exemplo crédito disponível => AVAILABLE). Mesmo uma única UG deve ser identificada; não peça nova medida se o histórico a especificar.",
  "Para cada consulta que não seja comparação, retorne metrics=[] (campo obrigatório do JSON estrito).",
  "PERCENTUAL eu disse é uma correção da pergunta anterior, não uma nova pergunta sobre o valor empenhado.",
  "Preserve unidade, medidas e filtros no histórico, a menos que o usuário os altere. Nossa OM é scope=own; todas as OM é scope=all.",
  "Se mencionar outra UG/UASG, use scope=unit e informe unit. No acompanhamento da própria OM, continue scope=own.",
  "Para divisão por OM/UASG, groupBy=UG; por ND use ND, por PI use PI. Para maior empenho ranking e groupBy=NE.",
  "Se houver ambiguidade genuína que impeça o cálculo, intent=clarify. Ausência de uma operação numérica neste catálogo não é ausência de dados: para investigar campos, documentos e prazos, use intent=analysis e capability=credits-tg; o agente explorará a fonte com ferramentas.",
  "source significa apenas identificar qual UG/OM originou o resultado agregado anterior. Para listar documentos, não use source.",
  "documents significa listar registros ou documentos que contribuíram com uma medida; preencha entity=NC para Notas de Crédito e entity=NE para Notas de Empenho. NC não é NE.",
  "O módulo Créditos oferece queryTgNcComposition para detalhar NC da provisão e sua relação com o saldo. Para 'quais NC compõem esse saldo', intent=documents e entity=NC; preserve UG do diálogo, metric=AVAILABLE e NÃO preencha search com 'NC'.",
  "Se o assistente acabou de perguntar se o usuário quer a lista e o usuário respondeu sim/quero, EXECUTE a intenção de listar os documentos, sem repetir a mesma confirmação.",
  "Para perguntas sobre qual UG/UASG gerou o valor anterior, ou se pertence ao Comando ou OMDS, use intent=source, scope=context, metric=null. Verifique a proveniência, sem recalcular saldos nem pedir outra métrica.",
  "Alerta/risco/por quê, prazos, vencimentos e interpretação de descrições pedem intent=analysis: o agente consultará os documentos completos e suas ferramentas. Nenhum valor bruto isolado comprova irregularidade.",
  "O seletor visual do frontend não restringe a consulta contábil. Nunca adivinhe códigos, datas, percentuais ou UASG.",
].join("\n");

function noStructuredOutput(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error)) return false;
  return error.name === "AI_NoOutputGeneratedError" || error.name === "AI_NoObjectGeneratedError";
}

/**
 * A non-reasoning, structured-output-capable planner prevents the tiny output
 * budget from being exhausted by model reasoning. Retry exactly once, with the
 * configured conversational model, only for empty/malformed model output.
 */
export async function planMclSemanticQuery(input: MclChatRequest, actor: MclAiActor, abortSignal?: AbortSignal) {
  const conversationalModel = resolveMclModel();
  const plannerId = process.env.MCL_AI_PLANNER_MODEL?.trim() || "openai/gpt-4.1-mini";
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(plannerId)) {
    throw new MclAiServiceError("INVALID_AI_MODEL", "MCL_AI_PLANNER_MODEL inválido.", 500);
  }
  const primaryModel = plannerId === conversationalModel.modelId
    ? conversationalModel
    : { ...conversationalModel, model: gateway(plannerId), modelId: plannerId };
  const pseudonymous = createHash("sha256").update(actor.id).digest("hex").slice(0, 24);
  const prompt = JSON.stringify({
    currentQuestion: input.prompt,
    recentHistory: input.history.map(({ role, content }) => ({ role, content })),
  });
  const callPlanner = async (model: typeof primaryModel, maxOutputTokens: number) => {
    const planned = await generateText({
      model: model.model,
      output: Output.object({ schema: aiSemanticPlanSchema }),
      instructions: instructions + "\nCatálogo de capacidades habilitadas: " + JSON.stringify(semanticCatalogueForModel()),
      prompt,
      abortSignal,
      timeout: { totalMs: 25_000 },
      maxOutputTokens,
      providerOptions: { gateway: {
        disallowPromptTraining: true, sort: "cost",
        tags: ["mcl", "cognitive-core-v1"],
        user: "mcl-" + pseudonymous,
      } },
    });
    return { plan: planned.output, model, usage: planned.usage };
  };
  try {
    return await callPlanner(primaryModel, 1024);
  } catch (error) {
    if (!noStructuredOutput(error)) throw error;
    console.warn(JSON.stringify({
      level: "warning", message: "Planejador não gerou saída; retentativa estruturada com segundo modelo",
      code: "AI_NO_STRUCTURED_OUTPUT", model: primaryModel.modelId,
    }));
    try {
      return await callPlanner(conversationalModel, 2048);
    } catch (retryError) {
      if (!noStructuredOutput(retryError)) throw retryError;
      throw new MclAiServiceError(
        "AI_SEMANTIC_PLAN_EMPTY",
        "O serviço de IA não produziu plano após duas tentativas. A interpretação não foi simulada.",
        503, true,
      );
    }
  }
}

type CreditResultData = {
  source: { fileName: string; importedAt: string };
  filters: { ug: string | null; nd: string | null; pi: string | null; matchedUgs: Array<{ ug: string; om: string }> };
  metric: string;
  totals: Record<string, number> & { metricValueCents: number };
  groups: Array<{ label: string; metricValueCents: number } & Record<string, number | string | undefined>>;
};

const metricField: Record<string, string> = {
  AVAILABLE: "availableCreditCents",
  PROVISION: "provisionUpdatedCents",
  COMMITTED: "committedCents",
  LIQUIDATED: "liquidatedCents",
  TO_LIQUIDATE: "committedToLiquidateCents",
  PAID: "paidCents",
};

function metricName(metric: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "crédito disponível", PROVISION: "provisão atualizada",
    COMMITTED: "total empenhado", LIQUIDATED: "total liquidado",
    TO_LIQUIDATE: "total a liquidar", PAID: "total pago",
  };
  return labels[metric] ?? metric;
}

function formatRatio(data: CreditResultData, plan: AiSemanticPlan): string {
  const numeratorField = plan.metric ? metricField[plan.metric] : undefined;
  const denominatorField = plan.denominator ? metricField[plan.denominator] : undefined;
  const numerator = numeratorField ? data.totals[numeratorField] : undefined;
  const denominator = denominatorField ? data.totals[denominatorField] : undefined;
  if (!numeratorField || !denominatorField || typeof numerator !== "number" || typeof denominator !== "number" || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return "Não é possível calcular o percentual: numerador ou denominador não está disponível ou é igual a zero. Nenhum percentual foi estimado.";
  }
  const detail = data.groups.length > 1 && plan.groupBy && plan.groupBy !== "TOTAL"
    ? data.groups.map((group) => {
      const n = Number(group[numeratorField]);
      const d = Number(group[denominatorField]);
      if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return group.label + ": sem denominador positivo.";
      return group.label + ": " + percent(n, d) + " (" + money(n) + " de " + money(d) + ").";
    }) : [];
  return [
    percent(numerator, denominator) + " do " + metricName(plan.denominator || "") + " corresponde ao " + metricName(plan.metric || "") + ".",
    "Numerador: " + money(numerator) + ". Denominador: " + money(denominator) + ".",
    ...detail,
    "Fonte: " + data.source.fileName + ", importada em " + fmtDate(data.source.importedAt) + ".",
  ].join("\n");
}

const comparableMetrics = {
  AVAILABLE: "Crédito disponível",
  PROVISION: "Provisão atualizada",
  COMMITTED: "Empenhado",
  LIQUIDATED: "Liquidado",
  TO_LIQUIDATE: "A liquidar",
  PAID: "Pago",
} as const;

type ComparableMeasure = keyof typeof comparableMetrics;
function comparisonValue(data: CreditResultData, measure: ComparableMeasure): number | undefined {
  const field = metricField[measure];
  const value = data.totals[field];
  return Number.isFinite(value) ? value : undefined;
}

/** No model-generated arithmetic: one authorized TG snapshot, several typed measures. */
function formatComparison(data: CreditResultData, measures: ComparableMeasure[]) {
  if (measures.length < 2) return "É necessário selecionar pelo menos duas medidas para comparar.";
  const unit = data.filters.matchedUgs.length === 1 ? data.filters.matchedUgs[0] : null;
  const rows = measures.map((measure) => {
    const value = comparisonValue(data, measure);
    return comparableMetrics[measure] + ": " + (value === undefined ? "não disponível" : money(value));
  });
  if (measures.includes("COMMITTED")) {
    const committed = comparisonValue(data, "COMMITTED");
    if (committed !== undefined && committed > 0) {
      for (const measure of (["LIQUIDATED", "PAID", "TO_LIQUIDATE"] as const)) {
        if (measures.includes(measure)) {
          const value = comparisonValue(data, measure);
          if (value !== undefined) rows.push(
            comparableMetrics[measure] + " sobre empenhado: " + percent(value, committed),
          );
        }
      }
    }
  }
  return [
    unit ? "Comparação para UG/UASG " + unit.ug + " (" + unit.om + "):"
      : "Comparação de medidas no conjunto de UG/UASG autorizado:",
    ...rows,
    "Fonte: " + data.source.fileName + ", importada em " + fmtDate(data.source.importedAt) + ".",
  ].join("\n");
}

function formatCreditBreakdown(data: CreditResultData, metric: string) {
  if (!data.groups.length) return "Nenhuma UG/UASG encontrada no agrupamento solicitado.";
  const field = metricField[metric] || "metricValueCents";
  const lines = data.groups.map((group) => {
    const value = group[field];
    return group.label + ": " + (typeof value === "number" && Number.isFinite(value) ? money(value) : "valor não disponível") + ".";
  });
  const total = data.totals[field];
  return [
    "Detalhamento de " + metricName(metric) + " por " + (data.groups.length === 1 ? "1 unidade" : data.groups.length + " unidades") + ":",
    ...lines,
    typeof total === "number" ? "Total no filtro: " + money(total) + "." : "",
    "Fonte: " + data.source.fileName + ", importada em " + fmtDate(data.source.importedAt) + ".",
  ].filter(Boolean).join("\n");
}

async function resolveAuthorizedUnit(plan: AiSemanticPlan, input: MclChatRequest, actor: MclAiActor) {
  // 'context' só resolve quando existe referência verificável no histórico.
  const previousText = input.history.map(({ content }) => content).join(" ");
  // Reuse only a previously displayed assistant UG and validate it again
  // against the authorized TG projection before reporting its identity.
  const previousAssistantUg = input.history.slice().reverse()
    .filter((message) => message.role === "assistant")
    .map((message) => message.content.match(/UG\/UASG\s+(1\d{5})/i)?.[1])
    .find(Boolean);
  if (plan.scope === "context" && previousAssistantUg) {
    return { unit: previousAssistantUg, needsUnit: false };
  }
  const bound = plan.scope === "own" || (plan.scope === "context" && /\b(?:noss[ao]s?|minha|meu)\s+(?:om|unidade)\b/i.test(previousText));
  if (bound) {
    const organization = actor.organizationId ? await prisma.organization.findUnique({
      where: { id: actor.organizationId }, select: { uasg: true },
    }) : null;
    return { unit: organization?.uasg || null, needsUnit: !organization?.uasg };
  }
  if (plan.scope === "unit") return { unit: plan.unit || null, needsUnit: !plan.unit };
  if (plan.scope === "context") {
    const recentExplicit = previousText.match(/\b(1\d{5})\b/g)?.at(-1);
    return { unit: recentExplicit || null, needsUnit: !recentExplicit };
  }
  return { unit: null, needsUnit: false };
}

function cognitiveResponse(
  answer: string, requestId: string, parsed: Awaited<ReturnType<typeof planMclSemanticQuery>>,
  citations: RagResponse["citations"] = [], warnings: string[] = [],
): RagResponse {
  return {
    answer, citations, warnings, requestId,
    suggestedQuestions: ["Detalhe o resultado por UASG.", "Compare valor empenhado, liquidado e pago."],
    provider: parsed.model.provider, model: parsed.model.modelId, authMode: parsed.model.authMode,
    usage: {
      inputTokens: parsed.usage.inputTokens,
      outputTokens: parsed.usage.outputTokens,
      totalTokens: parsed.usage.totalTokens,
    },
  };
}

/**
 * Cognitive Core MVP: LLM selects typed financial operation; server validates scope
 * and performs exact arithmetic using persisted TG. Never exposes SQL to the model.
 * A new module registers a capability and server adapter; this core has no phrases.
 */
export async function runMclCognitiveCore(input: MclChatRequest, actor: MclAiActor, requestId: string, signal?: AbortSignal): Promise<RagResponse | null> {
  const parsed = await planMclSemanticQuery(input, actor, signal);
  const plan = parsed.plan;
  if (plan.capability === "other" || !findSemanticCapability(plan.capability)) return null;
  // Documentary interpretation and clarifications need the full tool-using agent,
  // not a canned list or a second request to confirm the same intention.
  if (["analysis", "clarify", "documents"].includes(plan.intent) || plan.entity === "NC") return null;
  const comparison = plan.intent === "compare" && plan.metrics.length >= 2;
  if (!plan.metric && !comparison && plan.intent !== "source") return null;

  const target = await resolveAuthorizedUnit(plan, input, actor);
  if (target.needsUnit) {
    return cognitiveResponse(
      "Preciso identificar a UASG da unidade para essa consulta. Informe a UASG ou estabeleça o vínculo da sua OM no módulo de Créditos; não vou ampliar silenciosamente a consulta para todas as unidades.",
      requestId, parsed,
    );
  }
  // O planejador pode preservar classificações do histórico mesmo quando a
  // pergunta atual inicia uma nova busca por objeto. Revalidar a busca apenas
  // contra a mensagem corrente impede que ND/PI antigos estreitem o resultado
  // sem terem sido repetidos pelo usuário.
  const currentIntent = resolveCreditAnalyticsIntent({ ...input, history: [] });
  const startsObjectSearch = Boolean(plan.search && currentIntent.search);
  const filters: CreditAnalyticsInput = {
    ug: target.unit || undefined,
    nd: startsObjectSearch ? currentIntent.nd : plan.nd || undefined,
    pi: startsObjectSearch ? currentIntent.pi : plan.pi || undefined,
    search: startsObjectSearch ? currentIntent.search : plan.search || undefined,
    metric: plan.metric ?? (comparison ? plan.metrics[0] : "AVAILABLE"),
    groupBy: plan.intent === "source" ? "UG" : plan.intent === "ranking" ? "NE" : (plan.groupBy || "TOTAL"),
    sort: plan.intent === "ranking" ? "VALUE_DESC" : undefined,
    limit: plan.intent === "ranking" ? 8 : 15,
    includeFinalities: false,
  };
  const envelope = await queryTgCreditAnalytics(actor, filters);
  if (envelope.status !== "AVAILABLE") {
    return cognitiveResponse(
      "Não há dados de Créditos verificáveis para esta consulta. " + (envelope.gaps.join(" ") || "Fonte indisponível."),
      requestId, parsed, envelope.citations, envelope.gaps,
    );
  }

  const data = envelope.data as CreditResultData;
  const asOf = Date.parse(envelope.asOf);
  const isOld = Number.isFinite(asOf) && Date.now() - asOf > 24 * 60 * 60 * 1000;
  const notes = [
    ...(isOld ? ["Carga TG desatualizada há mais de 24 horas; estes valores não representam saldo atualizado hoje."] : []),
    ...envelope.gaps,
  ];
  if (filters.ug && !data.filters.matchedUgs.length) {
    return cognitiveResponse("Nenhuma UG/UASG corresponde ao filtro solicitado. Isso não equivale a saldo zero.", requestId, parsed, envelope.citations, notes);
  }
  if (comparison) {
    return cognitiveResponse(
      formatComparison(data, plan.metrics), requestId, parsed, envelope.citations, notes,
    );
  }
  if (plan.intent === "breakdown" && (plan.groupBy ?? "TOTAL") !== "TOTAL" && plan.metric) {
    return cognitiveResponse(
      formatCreditBreakdown(data, plan.metric), requestId, parsed, envelope.citations, notes,
    );
  }
  if (plan.intent === "source") {
    const verified = target.unit
      ? data.filters.matchedUgs.filter((item) => item.ug === target.unit)
      : data.filters.matchedUgs;
    const identity = verified.length === 1
      ? "O valor consultado pertence à UG/UASG " + verified[0].ug + ": " + verified[0].om
        + ". Está filtrado para essa UG, não para a soma das OMDS."
      : verified.length > 1
        ? "A consulta abrange " + verified.length + " UGs: "
          + verified.map((item) => item.ug + " (" + item.om + ")").join("; ") + "."
        : "Não consegui comprovar a UG/UASG da resposta anterior com a fonte autorizada. Informe o código para verificar.";
    return cognitiveResponse(
      identity + " Fonte: " + data.source.fileName + ", importada em " + fmtDate(data.source.importedAt) + ".",
      requestId, parsed, envelope.citations, notes,
    );
  }
  if (plan.intent === "ratio") {
    return cognitiveResponse(formatRatio(data, plan), requestId, parsed, envelope.citations, notes);
  }
  const intent: ResolvedCreditIntent = { ...filters, ranking: plan.intent === "ranking", answerable: true };
  const answer = formatCreditAnalyticsAnswer(data as Parameters<typeof formatCreditAnalyticsAnswer>[0], intent);
  return cognitiveResponse(answer, requestId, parsed, envelope.citations, notes);
}

