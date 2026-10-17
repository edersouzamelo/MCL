import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { resolveMclModel } from "@/modules/ai/provider";
import { queryTgCreditAnalytics } from "@/modules/ai/silos";
import { runFinancialInterpretation } from "@/modules/ai/financial-interpretation";

vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@/modules/ai/provider", () => ({ resolveMclModel: vi.fn() }));
vi.mock("@/modules/ai/silos", () => ({ queryTgCreditAnalytics: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { organization: { findUnique: vi.fn() } } }));

const actor = { id: "user-example", organizationId: "org-example", roles: [] };
const original = {
  status: "AVAILABLE",
  dataNature: "CALCULATED_FROM_PERSISTED",
  asOf: "2026-09-11T22:21:09.000Z",
  citations: [{ title: "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx", source: "TESOURO_GERENCIAL", asOf: "2026-09-11T22:21:09.000Z" }],
  gaps: [],
  data: {
    source: { fileName: "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx", importedAt: "2026-09-11T22:21:09.000Z" },
    filters: { ug: null, matchedUgs: [] },
    totals: { committedCents: 4778759258, committedToLiquidateCents: 10000000 },
    groups: [{ ne: "2026NE000001", ug: "160136", om: "Cmdo 9 Gpt Log", description: "Objeto de teste", committedToLiquidateCents: 10000000 }],
  },
};

describe("Análise qualitativa de créditos com modelo de linguagem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue(original as never);
    vi.mocked(resolveMclModel).mockReturnValue({
      model: "fake-model",
      provider: "vercel-ai-gateway", authMode: "oidc", modelId: "openai/gpt-5-mini",
    } as never);
    vi.mocked(generateText).mockResolvedValue({
      text: "O valor empenhado não comprova alerta automático. Os saldos a liquidar precisam de análise de prazos.",
      usage: { inputTokens: 200, outputTokens: 37, totalTokens: 237 },
    } as never);
  });

  it("consulta a fonte estruturada e gera uma única explicação com o LLM", async () => {
    const answer = await runFinancialInterpretation({
      prompt: "Existe algum empenho não liquidado que deve gerar alerta?",
      scope: "Todos os Dados", history: [],
    }, actor, "req-llm");
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      metric: "TO_LIQUIDATE", groupBy: "NE", sort: "VALUE_DESC", limit: 5,
    }));
    expect(generateText).toHaveBeenCalledTimes(1);
    const invocation = vi.mocked(generateText).mock.calls[0][0];
    expect(String(invocation.prompt)).toContain("2026NE000001");
    expect(String(invocation.system)).toContain("não caracteriza atraso");
    expect(answer?.provider).toBe("vercel-ai-gateway");
    expect(answer?.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Nenhum critério institucional de alerta"),
    ]));
  });

  it("mantém a referência contextual de uma pergunta subsequente", async () => {
    await runFinancialInterpretation({
      prompt: "porque esse valor deve ser alerta?",
      scope: "Todos os Dados",
      history: [{ role: "user", content: "Existe algum empenho não liquidado que deve gerar alerta?" }],
    }, actor, "req-why");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(generateText).mock.calls[0][0].prompt)).toContain("porque esse valor");
  });

  it("não chama LLM quando a projeção autorizada está ausente", async () => {
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      status: "UNAVAILABLE", dataNature: "NONE", asOf: "2026-10-17T12:00:00Z",
      citations: [], gaps: ["Nenhuma projeção TG persistida."], data: { records: [] },
    } as never);
    const answer = await runFinancialInterpretation({
      prompt: "Quais empenhos não liquidados devem gerar alerta?",
      scope: "Todos os Dados", history: [],
    }, actor, "req-empty");
    expect(generateText).not.toHaveBeenCalled();
    expect(answer?.answer).toContain("Nenhuma projeção TG persistida");
  });

  it("não desvia perguntas sobre outro domínio apenas por terem termos interpretativos", async () => {
    const answer = await runFinancialInterpretation({
      prompt: "Por que o CATMAT está pendente?",
      scope: "Todos os Dados", history: [],
    }, actor, "req-not-credit");
    expect(answer).toBeNull();
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });
});
