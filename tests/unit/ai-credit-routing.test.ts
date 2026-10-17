import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { queryTgCreditAnalytics } from "@/modules/ai/silos";
import { resolveCreditAnalyticsIntent, runCreditAnalyticsContingency } from "@/modules/ai/credit-analytics";

vi.mock("@/server/db", () => ({
  prisma: { organization: { findUnique: vi.fn() } },
}));
vi.mock("@/modules/ai/silos", () => ({
  queryTgCreditAnalytics: vi.fn(),
}));

const actor = { id: "test-user", organizationId: "org-test", roles: [] };
const request = (prompt: string) => ({ prompt, scope: "Todos os Dados" as const, history: [] });

const projection = {
  status: "AVAILABLE",
  dataNature: "CALCULATED_FROM_PERSISTED",
  asOf: "2026-09-11T22:21:09.000Z",
  citations: [{ title: "TG_SET_2026.xlsx", source: "TESOURO_GERENCIAL", asOf: "2026-09-11T22:21:09.000Z" }],
  gaps: [],
  data: {
    source: { fileName: "TG_SET_2026.xlsx", importedAt: "2026-09-11T22:21:09.000Z" },
    filters: { ug: "160136", nd: null, pi: null, search: null, matchedUgs: [{ ug: "160136", om: "Cmdo 9 Gpt Log" }] },
    metric: "AVAILABLE",
    totals: { metricValueCents: 123450, neCount: 1, ncCount: 1 },
    groups: [],
    finalities: [],
  },
};

describe("Assistente IA: roteamento contábil", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ["qual o percentual de empenhos a liquidar de todas as OM?", "TO_LIQUIDATE_OF_COMMITTED", "TO_LIQUIDATE"],
    ["e o percentual de empenho pago?", "PAID_OF_COMMITTED", "PAID"],
    ["já pagamos quantos % do total empenhado?", "PAID_OF_COMMITTED", "PAID"],
  ] as const)("entende percentuais: %s", (question, percentage, metric) => {
    const intent = resolveCreditAnalyticsIntent(request(question));
    expect(intent.answerable).toBe(true);
    expect(intent.percentage).toBe(percentage);
    expect(intent.metric).toBe(metric);
  });

  it("não devolve total genérico em questões de risco e causalidade", async () => {
    for (const prompt of [
      "Existe algum empenho não liquidado que deve gerar alerta?",
      "porque esse valor deve ser alerta?",
    ]) {
      const result = await runCreditAnalyticsContingency({
        ...request(prompt), history: [{ role: "user", content: "Qual o total empenhado?" }],
      }, actor, "req-test");
      expect(result).toBeNull();
    }
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("calcula parte paga sobre total empenhado, sem substituir porcentagem por valor bruto", async () => {
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...projection,
      data: {
        ...projection.data,
        metric: "PAID",
        totals: { ...projection.data.totals, committedCents: 10000, paidCents: 2500, committedToLiquidateCents: 6500 },
      },
    } as never);
    const result = await runCreditAnalyticsContingency(request("já pagamos quantos % do total empenhado?"), actor, "req-test");
    expect(result?.answer).toContain("25,00%");
    expect(result?.answer).toMatch(/R\$\s+100,00/);
    expect(result?.answer).toMatch(/R\$\s+25,00/);
    expect(result?.answer).not.toContain("R$ 1.234,50");
  });

  it("calcula parte a liquidar por unidade sobre os empenhos, sem gerar alertas automáticos", async () => {
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...projection,
      data: {
        ...projection.data,
        metric: "TO_LIQUIDATE",
        filters: { ...projection.data.filters, ug: null },
        totals: { ...projection.data.totals, committedCents: 10000, committedToLiquidateCents: 6000, paidCents: 3000 },
        groups: [{
          label: "160136: Cmdo 9 Gpt Log",
          committedCents: 8000, committedToLiquidateCents: 4000, paidCents: 3000,
        }, {
          label: "160142: 9 B Sup",
          committedCents: 2000, committedToLiquidateCents: 2000, paidCents: 0,
        }],
      },
    } as never);
    const result = await runCreditAnalyticsContingency(request("qual o percentual de empenhos a liquidar de todas as OM?"), actor, "req-test");
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({
      metric: "TO_LIQUIDATE", groupBy: "UG",
    }));
    expect(result?.answer).toContain("60,00%");
    expect(result?.answer).toContain("50,00%");
    expect(result?.answer).toContain("100,00%");
  });

  it.each([
    ["qual o percentual de liquidação em relação ao total empenhado?", "LIQUIDATED_OF_COMMITTED", "LIQUIDATED"],
    ["qual a porcentagem liquidada sobre o empenhado?", "LIQUIDATED_OF_COMMITTED", "LIQUIDATED"],
    ["já liquidamos qual percentual do total empenhado?", "LIQUIDATED_OF_COMMITTED", "LIQUIDATED"],
  ] as const)("reconhece percentual liquidado: %s", (prompt, percentage, metric) => {
    const intent = resolveCreditAnalyticsIntent(request(prompt));
    expect(intent.answerable).toBe(true);
    expect(intent.percentage).toBe(percentage);
    expect(intent.metric).toBe(metric);
  });

  it("preserva a UASG e calcula a liquidação na sequência real de três turnos", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: "160136" } as never);
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      ...projection,
      data: {
        ...projection.data,
        metric: "LIQUIDATED",
        totals: {
          ...projection.data.totals,
          committedCents: 10000,
          liquidatedCents: 4000,
          paidCents: 3000,
        },
      },
    } as never);

    const conversation = [
      "qual o saldo liquidado da nossa OM?",
      "qual o percentual de liquidação em relação ao total empenhado?",
      "PERCENTUAL eu disse",
    ];
    const history = [];
    for (const prompt of conversation) {
      const input = {
        ...request(prompt),
        history: history.map((content) => ({ role: "user" as const, content })),
      };
      const answer = await runCreditAnalyticsContingency(input, actor, "req-sequencia");
      expect(queryTgCreditAnalytics).toHaveBeenLastCalledWith(
        actor,
        expect.objectContaining({ ug: "160136", metric: "LIQUIDATED", groupBy: "TOTAL" }),
      );
      expect(answer?.answer).toContain("UG/UASG 160136");
      if (prompt !== conversation[0]) {
        expect(answer?.answer).toContain("40,00%");
        expect(answer?.answer).toMatch(/R\$\s+100,00/);
        expect(answer?.answer).toMatch(/R\$\s+40,00/);
      }
      history.push(prompt);
    }
    expect(prisma.organization.findUnique).toHaveBeenCalledTimes(3);
    expect(queryTgCreditAnalytics).toHaveBeenCalledTimes(3);
  });

  it("não herda unidade própria quando o pedido atual abrange todas as OM", () => {
    const intent = resolveCreditAnalyticsIntent({
      ...request("Qual percentual a liquidar de todas as OM?"),
      history: [{ role: "user", content: "Qual o saldo da nossa OM?" }],
    });
    expect(intent.ownUnitContext).toBe(false);
    expect(intent.ug).toBeUndefined();
    expect(intent.groupBy).toBe("UG");
    expect(intent.percentage).toBe("TO_LIQUIDATE_OF_COMMITTED");
  });

  it("sem numerador identificável pede esclarecimento em vez de imprimir valor empenhado", async () => {
    const answer = await runCreditAnalyticsContingency({
      ...request("PERCENTUAL eu disse"),
      history: [{ role: "user", content: "Qual o total empenhado?" }],
    }, actor, "req-clarify");
    expect(answer?.answer).toContain("Especifique");
    expect(answer?.answer).toContain("percentual");
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("não recicla o último total quando a nova mensagem exige outra interpretação", async () => {
    const input = {
      ...request("O que posso concluir disso?"),
      history: [
        { role: "user" as const, content: "Qual o saldo liquidado da nossa OM?" },
        { role: "user" as const, content: "Qual percentual liquidado do total empenhado?" },
      ],
    };
    const intent = resolveCreditAnalyticsIntent(input);
    expect(intent.answerable).toBe(false);
    const response = await runCreditAnalyticsContingency(input, actor, "req-open");
    expect(response).toBeNull();
    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
  });

  it("reconhece créditos disponíveis no plural sem precisar do LLM", () => {
    const intent = resolveCreditAnalyticsIntent(request("Quanto de créditos disponíveis temos hoje?"));
    expect(intent.answerable).toBe(true);
    expect(intent.metric).toBe("AVAILABLE");
  });

  it("usa a UASG cadastrada para 'nossa OM' e expõe a data da carga", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: "160136" } as never);
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue(projection as never);
    const result = await runCreditAnalyticsContingency(request("Qual é o saldo disponível da nossa OM hoje?"), actor, "req-test");

    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-test" }, select: { uasg: true },
    });
    expect(queryTgCreditAnalytics).toHaveBeenCalledWith(actor, expect.objectContaining({ ug: "160136", metric: "AVAILABLE" }));
    expect(result?.answer).toContain("UG/UASG 160136");
    expect(result?.answer).toContain("não uma consulta ao saldo de hoje");
    expect(result?.provider).toBe("mcl-deterministic");
  });

  it("recusa total do grupamento como saldo de nossa OM quando falta a UASG", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ uasg: null } as never);
    const result = await runCreditAnalyticsContingency(request("Saldo disponível da nossa OM?"), actor, "req-test");

    expect(queryTgCreditAnalytics).not.toHaveBeenCalled();
    expect(result?.answer).toContain("não possui UASG vinculada");
    expect(result?.answer).not.toContain("3.583.901");
  });

  it("não inventa saldo quando não existe carga TG persistida", async () => {
    vi.mocked(queryTgCreditAnalytics).mockResolvedValue({
      status: "UNAVAILABLE", dataNature: "NONE", asOf: "2026-10-17T12:00:00Z",
      citations: [], gaps: ["Nenhuma projeção TG persistida."], data: { records: [] },
    } as never);
    const result = await runCreditAnalyticsContingency(request("Quanto de créditos disponíveis temos?"), actor, "req-test");
    expect(result?.answer).toContain("Nenhuma projeção TG persistida");
    expect(result?.answer).toContain("Nenhum saldo foi estimado");
  });
});
