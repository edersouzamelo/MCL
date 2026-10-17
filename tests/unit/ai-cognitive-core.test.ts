import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { prisma } from "@/server/db";
import { queryTgCreditAnalytics } from "@/modules/ai/silos";
import { resolveMclModel } from "@/modules/ai/provider";
import { runMclCognitiveCore } from "@/modules/ai/cognitive-core";
import { AI_CAPABILITY_REGISTRY, aiSemanticPlanSchema, type AiSemanticPlan } from "@/modules/ai/semantic-registry";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: vi.fn() };
});
vi.mock("@/modules/ai/provider", () => ({ resolveMclModel: vi.fn() }));
vi.mock("@/modules/ai/silos", () => ({ queryTgCreditAnalytics: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { organization: { findUnique: vi.fn() } } }));

const actor = { id: "user-ai-test", organizationId: "org-ai-test", roles: ["LOGISTICS_MANAGER" as const] };
const input = (prompt: string, history: Array<{role: "user" | "assistant"; content: string}> = []) => ({
  prompt, history, scope: "Todos os Dados" as const,
});
const basePlan: AiSemanticPlan = {
  capability: "credits-tg", intent: "ratio", metric: "LIQUIDATED", denominator: "COMMITTED",
  scope: "own", unit: null, nd: null, pi: null, search: null, groupBy: "TOTAL", clarification: null,
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

describe("Cognitive Core v1 / contratos semânticos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveMclModel).mockReturnValue({
      model: "mock-model", provider: "vercel-ai-gateway", authMode: "oidc",
      modelId: "openai/gpt-5-mini",
    } as never);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: "160136" } as never);
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue(tg as never);
    plan();
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

  it("responde necessidade de esclarecimento sem acessar dados indevidos", async () => {
    plan({ intent: "clarify", metric: null, clarification: "Qual medida deseja comparar?" });
    const response = await runMclCognitiveCore(input("qual é o percentual?"), actor, "req-ask");
    expect(response?.answer).toBe("Qual medida deseja comparar?");
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
