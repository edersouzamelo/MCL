import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/coverage/atas/search/route";
import { getServerSession } from "next-auth";
import { getDemoState, resetDemoState } from "@/server/demo-store";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("API Route - /api/coverage/atas/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDemoState();
  });

  it("retorna 401 caso o usuario nao esteja autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new Request("http://localhost/api/coverage/atas/search", {
      method: "POST",
      body: JSON.stringify({ needId: "need-calca-120" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("valida que o needId e obrigatorio", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-demo-admin", organizationId: "org-provedor-alfa" },
    });

    const request = new Request("http://localhost/api/coverage/atas/search", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("MISSING_NEED_ID");
  });

  it("retorna erro se nao houver mapeamento CATMAT confirmado", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-demo-admin", organizationId: "org-provedor-alfa" },
    });

    // Remove any mapping from demo state
    const state = getDemoState();
    state.itemCatalogMappings = [];

    const request = new Request("http://localhost/api/coverage/atas/search", {
      method: "POST",
      body: JSON.stringify({ needId: "need-calca-120" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("NO_CATMAT_MAPPING");
  });

  it("valida codigo CATMAT especifico para calca", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-demo-admin", organizationId: "org-provedor-alfa" },
    });

    const state = getDemoState();
    // Set up incorrect code for need-calca-120
    const incorrectMapping = {
      id: "mapping-incorrect",
      mclItemId: "item-calca",
      mclVariantId: "variant-calca-42",
      needId: "need-calca-120",
      externalCatalog: "CATMAT",
      externalItemCode: "111111", // expected 452757
      externalDescription: "Descricao incorreta",
      groupCode: "84",
      classCode: "8430",
      pdmCode: "1415",
      confirmedBy: "user-demo-admin",
      confirmedAt: new Date().toISOString(),
      justification: "Justificativa de teste",
      status: "ACTIVE" as const,
      confidence: 0.8,
      mappingVersion: 1,
    };
    state.itemCatalogMappings = [incorrectMapping];

    const request = new Request("http://localhost/api/coverage/atas/search", {
      method: "POST",
      body: JSON.stringify({ needId: "need-calca-120" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_CATMAT_CODE");
  });
});
