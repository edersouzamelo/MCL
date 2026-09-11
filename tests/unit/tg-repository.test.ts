import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { getLatestTg, persistTg, TG_SOURCE_KIND } from "@/modules/credits-tg/repository";
import type { TgReport } from "@/modules/credits-tg/parser";
vi.mock("@/server/db", () => ({ prisma: { financialSourceImport: { upsert: vi.fn(), findFirst: vi.fn() } } }));
beforeEach(() => vi.clearAllMocks());
describe("persistência TG independente", () => {
  it("consulta somente o contrato TG da organização solicitada", async () => {
    vi.mocked(prisma.financialSourceImport.findFirst).mockResolvedValue(null);
    expect(await getLatestTg("org-a")).toBeNull();
    expect(prisma.financialSourceImport.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a", sourceKind: "TG_MASTER_V1" } }));
  });
  it("reenvio usa checksum, reprocessa a projeção e não atualiza o horário do lote existente", async () => {
    const report: TgReport = { schema: "TG_MASTER_V1", parserVersion: 3, rows: [], metric: "Movim. Líquido", warnings: [], fileName: "fonte.xlsx", sourceDate: null };
    const input = { organizationId: "org-a", report, buffer: new TextEncoder().encode("conteudo").buffer, actor: "apps-script", method: "APPS_SCRIPT_TG" as const };
    await persistTg(input);
    await persistTg(input);
    const calls = vi.mocked(prisma.financialSourceImport.upsert).mock.calls;
    expect(calls[0][0].where).toEqual(calls[1][0].where);
    expect(calls[0][0].update).toMatchObject({ rowCount: 0, payload: expect.objectContaining({ parserVersion: 3 }) });
    expect(calls[0][0].update).not.toHaveProperty("importedAt");
    expect(calls[0][0].update).not.toHaveProperty("ingestionMethod");
    expect(calls[0][0].create).toMatchObject({ organizationId: "org-a", sourceKind: TG_SOURCE_KIND });
  });
});
