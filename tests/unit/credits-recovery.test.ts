import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/creditos/route";
import { getSiloCatalog, queryMclData } from "@/modules/ai/silos";
import * as financial from "@/modules/financial-snapshots/repository";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/modules/auth/options", () => ({ authOptions: {} }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.mocked(getServerSession).mockReset(); });

describe("separação Créditos TG e Escalão SAG", () => {
  it("não consulta os saldos SAG ao perguntar por créditos da UASG", async () => {
    vi.stubEnv("DATABASE_URL", "configured-for-test");
    const readSag = vi.spyOn(financial, "getLatestFinancialSnapshotPair");
    const response = await queryMclData({ id: "user", organizationId: "org", roles: ["ADMIN"] }, { silo: "CREDITOS" });
    expect(readSag).not.toHaveBeenCalled();
    expect(response.status).toBe("UNAVAILABLE");
    expect(response.dataNature).toBe("NONE");
    expect(response.gaps.join(" ")).toContain("Tesouro Gerencial");
    const catalog = getSiloCatalog(true).data.silos;
    expect(catalog.find(item => item.id === "CREDITOS")?.status).toBe("UNAVAILABLE");
    expect(catalog.find(item => item.id === "GRUPAMENTO")?.status).toBe("AVAILABLE");
  });
  it("protege a API de Créditos sem sessão", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
  it("declara reconexão pendente sem saldo nem data de atualização inventada", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user", organizationId: "org" } });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ source: "TESOURO_GERENCIAL", code: "TG_SOURCE_RECONNECTION_PENDING", dataNature: "NONE", lastUpdatedAt: null });
  });
});
