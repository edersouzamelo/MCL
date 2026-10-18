import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { prisma } from "@/server/db";
import { queryTgCreditAnalytics } from "@/modules/ai/silos";
import { resolveMclModel } from "@/modules/ai/provider";
import { runMclCognitiveCore } from "@/modules/ai/cognitive-core";
import { aiSemanticPlanSchema, type AiSemanticPlan } from "@/modules/ai/semantic-registry";
import { resolveNcQuestion } from "@/modules/ai/nc-validity";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: vi.fn() };
});
vi.mock("@/modules/ai/provider", () => ({ resolveMclModel: vi.fn() }));
vi.mock("@/modules/ai/silos", () => ({ queryTgCreditAnalytics: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { organization: { findUnique: vi.fn() } } }));

const actor = { id: "user-ai-test", organizationId: "org-ai-test", roles: ["LOGISTICS_MANAGER" as const] };
const input = (prompt: string, history: Array<{ role: "user" | "assistant"; content: string }> = []) => ({
  prompt, history, scope: "Todos os Dados" as const,
});
const basePlan: AiSemanticPlan = {
  capability: "credits-tg", intent: "ranking", metric: "COMMITTED", denominator: null,
  scope: "context", unit: null, nd: null, pi: null, search: "urgente", groupBy: "NE", clarification: null,
};
function plan(overrides: Partial<AiSemanticPlan> = {}) {
  vi.mocked(generateText).mockResolvedValue({
    output: aiSemanticPlanSchema.parse({ ...basePlan, ...overrides }),
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
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
    metric: "AVAILABLE", totals: { metricValueCents: 10000, neCount: 2, ncCount: 2 },
    groups: [], finalities: [],
  },
};
const previous = [
  { role: "user" as const, content: "Quais são as NC mais urgentes da UG 160136?" },
  { role: "assistant" as const, content: "Quais NC precisam de atenção?" },
  { role: "user" as const, content: "Mais urgentes: as que têm o menor prazo" },
  { role: "assistant" as const, content: "Você deseja o prazo de validade das NC?" },
  { role: "user" as const, content: "validade" },
  { role: "assistant" as const, content: "Por favor confirme se deseja a validade das NC." },
];

describe("Assistente MCL: validade das Notas de Crédito", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveMclModel).mockReturnValue({
      model: "mock-model", provider: "vercel-ai-gateway",
      authMode: "oidc", modelId: "openai/gpt-5-mini",
    } as never);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: "160136" } as never);
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue(tg as never);
    plan();
  });

  it("não apresenta empenhos como NC urgentes quando não há critério declarado", async () => {
    const response = await runMclCognitiveCore(input("Quais são as NC mais urgentes?"), actor, "req-nc-urgency");
    expect(response?.answer).toContain("Qual critério de urgência");
    expect(response?.answer).not.toContain("NE000");
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it.each([
    "mais urgentes: as que tem o menor prazo",
    "qual o prazo dessas NC?",
    "validade",
    "validade!",
    "sim",
    "já confirmei que quero!",
  ])("mantém NC e validade mesmo com plano equivocado de ranking NE: %s", async (question) => {
    const response = await runMclCognitiveCore(input(question, previous), actor, "req-nc-follow-up");
    expect(response?.answer).toContain("NC com o menor prazo de validade");
    expect(response?.answer).toContain("UG/UASG 160136");
    expect(response?.answer).toContain("não é possível informar esses prazos");
    expect(response?.answer).toContain("TG_SET_2026.xlsx");
    expect(response?.answer).not.toContain("confirme");
    expect(response?.answer).not.toContain("NE000");
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      ug: "160136", metric: "AVAILABLE", groupBy: "TOTAL",
    }));
    expect(response?.citations[0].source).toBe("TESOURO_GERENCIAL");
    expect(response?.warnings[0]).toContain("desatualizada");
  });

  it("executa nc_validity mesmo sem métrica numérica", async () => {
    plan({ intent: "nc_validity", metric: null, scope: "own" });
    const response = await runMclCognitiveCore(input("Qual a validade das NC?"), actor, "req-expiry");
    expect(response?.answer).toContain("não possui um campo validado");
    expect(response?.answer).not.toContain("Qual medida");
    expect(queryTgCreditAnalytics).toHaveBeenCalledTimes(1);
  });

  it("não inventa vencimento quando não há carga TG", async () => {
    plan({ intent: "nc_validity", metric: null, scope: "own" });
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...tg, status: "UNAVAILABLE", gaps: ["Sem importação TG persistida."],
    } as never);
    const response = await runMclCognitiveCore(input("validade das NC?"), actor, "req-unavailable");
    expect(response?.answer).toContain("Sem importação TG persistida");
    expect(response?.answer).toContain("Nenhum vencimento foi presumido");
    expect(response?.answer).not.toContain("confirme");
  });

  it("não transforma prazo de entrega de NE em validade de NC", () => {
    expect(resolveNcQuestion(input("E o prazo de entrega da NE?", previous), "analysis")).toBeNull();
  });

  it("não transforma confirmação isolada sem contexto em NC", () => {
    expect(resolveNcQuestion(input("sim"), "clarify")).toBeNull();
  });
});
