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
