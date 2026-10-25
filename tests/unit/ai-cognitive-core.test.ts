import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateText } from "ai";
import { prisma } from "@/server/db";
import { queryTgCreditAnalytics, queryTgNcComposition } from "@/modules/ai/silos";
import { resolveMclModel } from "@/modules/ai/provider";
import { runMclCognitiveCore } from "@/modules/ai/cognitive-core";
import { AI_CAPABILITY_REGISTRY, aiSemanticPlanSchema, type AiSemanticPlan } from "@/modules/ai/semantic-registry";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: vi.fn() };
});
vi.mock("@/modules/ai/provider", () => ({ resolveMclModel: vi.fn() }));
vi.mock("@/modules/ai/silos", () => ({ queryTgCreditAnalytics: vi.fn(), queryTgNcComposition: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { organization: { findUnique: vi.fn() } } }));

const actor = { id: "user-ai-test", organizationId: "org-ai-test", roles: ["LOGISTICS_MANAGER" as const] };
const input = (prompt: string, history: Array<{role: "user" | "assistant"; content: string}> = []) => ({
  prompt, history, scope: "Todos os Dados" as const,
});
const basePlan: AiSemanticPlan = {
  capability: "credits-tg", intent: "ratio", metric: "LIQUIDATED", denominator: "COMMITTED",
  scope: "own", unit: null, nd: null, pi: null, search: null, groupBy: "TOTAL", clarification: null,
  entity: null,
  metrics: [],
};

function plan(overrides: Partial<AiSemanticPlan> = {}) {
  const output = aiSemanticPlanSchema.parse({ ...basePlan, ...overrides });
  vi.mocked(generateText).mockResolvedValue({
    output, usage: { inputTokens: 160, outputTokens: 70, totalTokens: 230 },
  } as never);
}

const tg = {
  status: "AVAILABLE", dataNature: "CALCULATED_FROM_PERSISTED",
  asOf: "2026-09-11T22:21:09.000Z",
  citations: [{ title: "TG_SET_2026.xlsx", source: "TESOURO_GERENCIAL", asOf: "2026-09-11T22:21:09.000Z" }],
  gaps: [],
  data: {
    source: { fileName: "TG_SET_2026.xlsx", importedAt: "2026-09-11T22:21:09.000Z" },
    filters: { ug: "160136", nd: null, pi: null, search: null, matchedUgs: [{ ug: "160136", om: "Cmdo 9 Gpt Log" }] },
    metric: "LIQUIDATED",
    totals: {
      metricValueCents: 4000, committedCents: 10000, liquidatedCents: 4000, paidCents: 3000,
      committedToLiquidateCents: 6000, provisionUpdatedCents: 18000, availableCreditCents: 8000,
      neCount: 2, ncCount: 2,
    },
    groups: [],
    finalities: [],
  },
};

const ncRecords = {
  status: "AVAILABLE",
  dataNature: "CALCULATED_FROM_PERSISTED",
  asOf: "2026-09-11T22:21:09.000Z",
  citations: [{ title: "TG_SET_2026.xlsx", source: "TESOURO_GERENCIAL", asOf: "2026-09-11T22:21:09.000Z" }],
  gaps: [],
  data: {
    source: { fileName: "TG_SET_2026.xlsx", importedAt: "2026-09-11T22:21:09.000Z" },
    filters: { ug: "160136", nd: null, pi: null, search: null, matchedUgs: [{ ug: "160136", om: "Cmdo 9 Gpt Log" }] },
    totals: { provisionUpdatedCents: 100000, committedCents: 45000, availableCreditCents: 55000,
      reportedAvailableCreditCents: 55000, availableReconciliationCents: 0 },
    totalDocuments: 2, shownDocuments: 2,
    documents: [
      { ug: "160136", nc: "2026NC000123", purpose: "Suprimento classe II",
        pis: ["BIDS"], nds: ["339030"], provisionReceivedCents: 80000, provisionGrantedCents: 0,
        provisionUpdatedCents: 80000, reportedAvailableCreditCents: 40000, sourceLines: 2 },
      { ug: "160136", nc: "2026NC000124", purpose: "Apoio administrativo",
        pis: ["BIDES"], nds: ["339039"], provisionReceivedCents: 20000, provisionGrantedCents: 0,
        provisionUpdatedCents: 20000, reportedAvailableCreditCents: 15000, sourceLines: 1 },
    ],
  },
};

describe("Cognitive Core v1 / contratos semânticos", () => {
  it("gera JSON Schema estrito com TODOS os campos obrigatórios (Gateway OpenAI)", () => {
    const generated = z.toJSONSchema(aiSemanticPlanSchema);
    expect(generated.type).toBe("object");
    const properties = Object.keys(generated.properties ?? {});
    expect(generated.required).toEqual(expect.arrayContaining(properties));
    expect(generated.required).toHaveLength(properties.length);
    expect(properties).toContain("entity");
    expect(properties).toContain("metrics");
    expect(generated.additionalProperties).toBe(false);
    // Sem entidade o planejador retorna null, não omite campo obrigatório.
    expect(aiSemanticPlanSchema.safeParse({ ...basePlan, entity: null }).success).toBe(true);
    expect(aiSemanticPlanSchema.safeParse(Object.fromEntries(
      Object.entries(basePlan).filter(([key]) => key !== "entity")
    )).success).toBe(false);
  });


  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveMclModel).mockReturnValue({
      model: "mock-model", provider: "vercel-ai-gateway", authMode: "oidc",
      modelId: "openai/gpt-5-mini",
    } as never);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: "160136" } as never);
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue(tg as never);
    vi.mocked(queryTgNcComposition).mockResolvedValue(ncRecords as never);
    plan();
  });

  it.each([
    "isso é da uasg principal ou das OMDS?",
    "esse crédito é referente a qual uasg?",
    "Esse crédito é disponivel de qual UG???",
  ])("recupera a identidade comprovada da UG do resultado anterior: %s", async (prompt) => {
    plan({ intent: "source", metric: null, denominator: null, scope: "context", groupBy: null });
    const history = [
      { role: "user" as const, content: "qual é o crédito disponível da nossa uasg?" },
      { role: "assistant" as const, content: "O crédito disponível para UG/UASG 160136 é R$ 3.031.367,21. Fonte: TG_SET_2026.xlsx." },
    ];
    const response = await runMclCognitiveCore(input(prompt, history), actor, "req-source");
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      ug: "160136", groupBy: "UG",
    }));
    expect(response?.answer).toContain("UG/UASG 160136");
    expect(response?.answer).toContain("Cmdo 9 Gpt Log");
    expect(response?.answer).toContain("não para a soma das OMDS");
    expect(response?.citations[0].source).toBe("TESOURO_GERENCIAL");
  });

  it("pede esclarecimento verificável se não existe UG na resposta anterior", async () => {
    plan({ intent: "source", metric: null, denominator: null, scope: "context" });
    const response = await runMclCognitiveCore(input("Esse saldo é de qual UASG?"), actor, "req-no-provenance");
    expect(response?.answer).toContain("Preciso identificar a UASG");
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("compara empenhado, liquidado e pago no mesmo snapshot sem pedir métrica", async () => {
    plan({ intent: "compare", metric: null, metrics: ["COMMITTED", "LIQUIDATED", "PAID"],
      denominator: null, scope: "context", groupBy: "TOTAL" });
    const history = [
      { role: "user" as const, content: "Quanto de crédito disponível da nossa UASG?" },
      { role: "assistant" as const, content: "O crédito disponível para UG/UASG 160136 é R$ 80,00." },
    ];
    const result = await runMclCognitiveCore(
      input("Compare valor empenhado, liquidado e pago.", history), actor, "req-compare",
    );
    expect(result?.answer).toContain("UG/UASG 160136");
    expect(result?.answer).toMatch(/Empenhado: R\$\s+100,00/);
    expect(result?.answer).toMatch(/Liquidado: R\$\s+40,00/);
    expect(result?.answer).toMatch(/Pago: R\$\s+30,00/);
    expect(result?.answer).toContain("Liquidado sobre empenhado: 40,00%");
    expect(result?.answer).toContain("Pago sobre empenhado: 30,00%");
    expect(result?.answer).toContain("TG_SET_2026.xlsx");
    expect(result?.answer).not.toContain("Qual medida financeira deseja consultar");
    expect(queryTgCreditAnalytics).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("detalha crédito por UASG mesmo quando existe apenas uma unidade no filtro", async () => {
    plan({ intent: "breakdown", metric: "AVAILABLE", metrics: [], denominator: null, scope: "own", groupBy: "UG" });
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...tg, data: { ...tg.data, metric: "AVAILABLE",
        groups: [{ label: "160136: Cmdo 9 Gpt Log", availableCreditCents: 8000, metricValueCents: 8000 }],
        totals: { ...tg.data.totals, metricValueCents: 8000 },
      },
    } as never);
    const result = await runMclCognitiveCore(input("Detalhe o resultado por UASG."), actor, "req-breakdown");
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      ug: "160136", groupBy: "UG", metric: "AVAILABLE",
    }));
    expect(result?.answer).toContain("160136: Cmdo 9 Gpt Log");
    expect(result?.answer).toContain("1 unidade");
    expect(result?.answer).toMatch(/R\$\s+80,00/);
    expect(result?.answer).not.toContain("Qual medida financeira deseja consultar");
  });

  it("retenta planejamento sem saída uma única vez, usando o modelo conversacional", async () => {
    const err = Object.assign(new Error("structured output empty"), { name: "AI_NoOutputGeneratedError" });
    vi.mocked(generateText).mockRejectedValueOnce(err).mockResolvedValueOnce({
      output: aiSemanticPlanSchema.parse({ ...basePlan, intent: "value", metric: "AVAILABLE", denominator: null }),
      usage: { inputTokens: 120, outputTokens: 60, totalTokens: 180 },
    } as never);
    const result = await runMclCognitiveCore(input("Crédito disponível da nossa UG"), actor, "req-retry");
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(vi.mocked(generateText).mock.calls[0][0].maxOutputTokens).toBe(1024);
    expect(vi.mocked(generateText).mock.calls[1][0].maxOutputTokens).toBe(2048);
    expect(result?.model).toBe("openai/gpt-5-mini");
    expect(result?.answer).toContain("UG/UASG 160136");
  });

  it("não mascara duas falhas seguidas de saída do LLM como resposta de IA", async () => {
    const empty = Object.assign(new Error("no output"), { name: "AI_NoOutputGeneratedError" });
    vi.mocked(generateText).mockRejectedValue(empty);
    await expect(runMclCognitiveCore(input("De que UG é esse saldo?"), actor, "req-double-fail"))
      .rejects.toMatchObject({ name: "MclAiServiceError", code: "AI_SEMANTIC_PLAN_EMPTY", status: 503 });
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it.each([
    ["Quais NC compõem esse saldo?", "documents"],
    ["Mas digo: me mostre as NC que estão formando esse saldo disponível", "documents"],
    ["sim!!! quero!!!", "documents"],
    ["já falei que quero", "source"],
  ] as const)("delega documentos ao agente com acesso integral à fonte: %s", async (question, intent) => {
    plan({ intent, entity: "NC", metric: intent === "source" ? null : "AVAILABLE",
      scope: "context", denominator: null, search: "NC" });
    const history = [
      { role: "user" as const, content: "Qual é o nosso crédito disponível?" },
      { role: "assistant" as const, content: "O crédito disponível para UG/UASG 160136 é R$ 550,00." },
      { role: "user" as const, content: "Quais NC compõem esse saldo?" },
      { role: "assistant" as const, content: "Você deseja a lista detalhada das Notas de Crédito da UG 160136?" },
    ];
    const response = await runMclCognitiveCore(input(question, history), actor, "req-nc");
    expect(response).toBeNull();
    expect(queryTgNcComposition).not.toHaveBeenCalled();
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("não inventa NC se o extrato não trouxer documentos identificados", async () => {
    plan({ intent: "documents", entity: "NC", metric: "AVAILABLE", denominator: null });
    vi.mocked(queryTgNcComposition).mockResolvedValue({
      ...ncRecords,
      data: { ...ncRecords.data, totalDocuments: 0, shownDocuments: 0, documents: [] },
      gaps: ["Nenhuma NC individualizada identificada."],
    } as never);
    const response = await runMclCognitiveCore(input("Quais NC compõem o crédito disponível?"), actor, "req-empty-nc");
    expect(response).toBeNull();
    expect(queryTgNcComposition).not.toHaveBeenCalled();
  });

  it("preserva esclarecimento no fim de mensagem longa para o planejador", async () => {
    plan({intent:"analysis",metric:null});
    const content="Contexto. ".repeat(130)+"Critério confirmado: prazo de recolhimento da NC.";
    await runMclCognitiveCore(input("isso mesmo",[{role:"user",content}]),actor,"req-context");
    expect(JSON.stringify(vi.mocked(generateText).mock.calls[0][0])).toContain("Critério confirmado: prazo de recolhimento da NC.");
  });

  it("catálogo publica só capacidades efetivamente adaptadas; Radar não é falso disponível", () => {
    expect(AI_CAPABILITY_REGISTRY).toHaveLength(1);
    expect(AI_CAPABILITY_REGISTRY[0].id).toBe("credits-tg");
    expect(AI_CAPABILITY_REGISTRY[0].tool).toBe("queryTgCreditAnalytics");
    expect(AI_CAPABILITY_REGISTRY.some((item) => item.id === "radar")).toBe(false);
  });

  it.each([
    "Qual o percentual de liquidação dos empenhos da nossa OM?",
    "Quanto do que empenhamos já foi liquidado?",
    "Desses empenhos, qual a parcela liquidada?",
    "PERCENTUAL eu disse",
    "Que fração do total empenhado foi liquidada?",
    "Quanto já executamos em liquidação no total?",
  ])("uma operação planejada pelo modelo executa razão determinística: %s", async (question) => {
    const answer = await runMclCognitiveCore(input(question), actor, "req-core");
    expect(answer?.answer).toContain("40,00%");
    expect(answer?.answer).toMatch(/R\$\s+40,00/);
    expect(answer?.answer).toMatch(/R\$\s+100,00/);
    expect(answer?.answer).toContain("TG_SET_2026.xlsx");
    expect(answer?.provider).toBe("vercel-ai-gateway");
    expect(answer?.warnings[0]).toContain("desatualizada");
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      ug: "160136", metric: "LIQUIDATED", groupBy: "TOTAL",
    }));
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("preserva histórico da pergunta anterior no prompt enviado ao modelo", async () => {
    const history = [
      { role: "user" as const, content: "qual o saldo liquidado da nossa OM?" },
      { role: "assistant" as const, content: "R$ 40,00 para UASG 160136." },
      { role: "user" as const, content: "Qual o percentual sobre o total empenhado?" },
    ];
    await runMclCognitiveCore(input("PERCENTUAL eu disse", history), actor, "req-ctx");
    const invocation = vi.mocked(generateText).mock.calls[0][0];
    expect(String(invocation.prompt)).toContain("saldo liquidado da nossa OM");
    expect(String(invocation.prompt)).toContain("PERCENTUAL eu disse");
    expect(String(invocation.instructions)).toContain("OBJETO ESTRUTURADO");
  });

  it("não herda ND ou PI antigos quando a pergunta atual inicia busca por objeto em RPNP", async () => {
    plan({
      intent: "value",
      metric: "RPNP_REGISTERED_TOTAL",
      denominator: null,
      scope: "unit",
      unit: "9 BSUP",
      nd: "339039",
      pi: "PI-ANTIGO",
      search: "COTURNO",
      groupBy: "NE",
    });
    const history = [
      { role: "user" as const, content: "quanto de créditos que o 9 B Sup inscreveu em restos a pagar?" },
      { role: "assistant" as const, content: "O valor inscrito e reinscrito soma R$ 1.019.172,67." },
      { role: "user" as const, content: "quantos desses RP são de serviço 339039?" },
      { role: "assistant" as const, content: "Na ND 339039, o total soma R$ 626.234,65." },
    ];

    await runMclCognitiveCore(input("Existe empenho de COTURNO em RP?", history), actor, "req-rpnp-search");

    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      ug: "9 BSUP",
      metric: "RPNP_REGISTERED_TOTAL",
      search: "coturno",
      nd: undefined,
      pi: undefined,
      groupBy: "NE",
    }));
  });

  it.each([
    ["PAID", "COMMITTED", "30,00%"],
    ["TO_LIQUIDATE", "COMMITTED", "60,00%"],
    ["LIQUIDATED", "PROVISION", "22,22%"],
  ] as const)("usa numerador %s e denominador %s sem inventar medida", async (metric, denominator, expected) => {
    plan({ metric, denominator });
    const response = await runMclCognitiveCore(input("Qual o percentual?"), actor, "req-ratio");
    expect(response?.answer).toContain(expected);
  });

  it("rejeita zero como denominador", async () => {
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...tg, data: { ...tg.data, totals: { ...tg.data.totals, committedCents: 0 } },
    } as never);
    const response = await runMclCognitiveCore(input("Qual o percentual liquidado?"), actor, "req-zero");
    expect(response?.answer).toContain("Não é possível calcular");
    expect(response?.answer).not.toContain("Infinity");
  });

  it("não agrega todas as UG se própria OM não tiver vínculo", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: null } as never);
    const response = await runMclCognitiveCore(input("Quanto liquidou nossa OM?"), actor, "req-ug");
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
    expect(response?.answer).toContain("Preciso identificar a UASG");
  });

  it("aceita novo escopo explícito de todas as OM", async () => {
    plan({ scope: "all", groupBy: "UG" });
    const response = await runMclCognitiveCore(input("Compare percentuais de todas as OM"), actor, "req-all");
    expect(response?.answer).toContain("40,00%");
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({ ug: undefined, groupBy: "UG" }));
  });

  it("pergunta não financeira segue agente original sem simular resultado", async () => {
    plan({ capability: "other", intent: "analysis", metric: null });
    const response = await runMclCognitiveCore(input("Qual CATMAT de material?"), actor, "req-other");
    expect(response).toBeNull();
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("delega esclarecimento ao agente que preserva o contexto", async () => {
    plan({ intent: "clarify", metric: null, clarification: "Qual medida deseja comparar?" });
    const response = await runMclCognitiveCore(input("qual é o percentual?"), actor, "req-ask");
    expect(response).toBeNull();
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("pergunta analítica não é reduzida a saldo, pois demanda fundamentação", async () => {
    plan({ intent: "analysis", metric: "TO_LIQUIDATE" });
    const response = await runMclCognitiveCore(input("Algum empenho precisa de alerta institucional?"), actor, "req-risk");
    expect(response).toBeNull();
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("não responde valor quando a UG explícita não existe", async () => {
    plan({ intent: "value", scope: "unit", unit: "160142", metric: "COMMITTED", denominator: null });
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...tg, data: { ...tg.data, filters: { ...tg.data.filters, ug: "160142", matchedUgs: [] } },
    } as never);
    const response = await runMclCognitiveCore(input("Empenhado da UASG 160142"), actor, "req-unmatched");
    expect(response?.answer).toContain("não equivale a saldo zero");
  });

  it("contrato de plano rejeita módulo e métricas desconhecidos", () => {
    expect(() => aiSemanticPlanSchema.parse({ ...basePlan, capability: "radar" })).toThrow();
    expect(() => aiSemanticPlanSchema.parse({ ...basePlan, metric: "FAKE_VALUE" })).toThrow();
  });
});

