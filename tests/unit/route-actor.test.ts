import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { getRouteActor } from "@/modules/auth/route-actor";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("identificacao do ator da rota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nao fabrica ator administrativo quando a sessao esta ausente", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    await expect(getRouteActor()).resolves.toBeUndefined();
  });

  it("aceita somente ator com organizacao e papeis presentes na sessao", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "user-demo-admin",
        organizationId: "org-provedor-alfa",
        roles: ["LOGISTICS_MANAGER"],
      },
      expires: "2099-01-01T00:00:00.000Z",
    });

    await expect(getRouteActor()).resolves.toEqual({
      id: "user-demo-admin",
      organizationId: "org-provedor-alfa",
      roles: ["LOGISTICS_MANAGER"],
    });
  });
});
