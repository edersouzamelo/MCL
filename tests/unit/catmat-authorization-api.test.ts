import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coverage/catmat/confirm/route";
import { getRouteActor } from "@/modules/auth/route-actor";
import { confirmCatalogMapping } from "@/modules/coverage/service";

vi.mock("@/modules/auth/route-actor", () => ({
  getRouteActor: vi.fn(),
}));

vi.mock("@/modules/coverage/service", () => ({
  confirmCatalogMapping: vi.fn(),
}));

function request() {
  return new Request("http://localhost/api/coverage/catmat/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ needId: "need-coturno-200", candidateId: "candidate-1", justification: "Teste" }),
  });
}

describe("autorizacao da confirmacao CATMAT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 sem sessao", async () => {
    vi.mocked(getRouteActor).mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(confirmCatalogMapping).not.toHaveBeenCalled();
  });

  it("retorna 403 para papel sem permissao", async () => {
    vi.mocked(getRouteActor).mockResolvedValue({
      id: "user-demo-viewer",
      organizationId: "org-bravo",
      roles: ["COMMAND_VIEWER"],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(confirmCatalogMapping).not.toHaveBeenCalled();
  });

  it("permite o gestor logistico vinculado", async () => {
    vi.mocked(getRouteActor).mockResolvedValue({
      id: "user-demo-admin",
      organizationId: "org-provedor-alfa",
      roles: ["LOGISTICS_MANAGER"],
    });
    vi.mocked(confirmCatalogMapping).mockResolvedValue({ id: "mapping-1" } as never);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(confirmCatalogMapping).toHaveBeenCalledOnce();
  });
});
