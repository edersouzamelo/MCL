import { beforeEach, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { prisma } from "@/server/db";
import { POST } from "@/app/api/creditos/uasg/route";
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/modules/auth/options", () => ({ authOptions: {} }));
vi.mock("@/server/db", () => ({ prisma: { organization: { updateMany: vi.fn() } } }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u", organizationId: "session-org", roles: ["ADMIN"] } }); });
const request = (body: unknown) => new Request("http://localhost/api/creditos/uasg", { method: "POST", body: JSON.stringify(body) });
it("links only the session organization and cannot overwrite a different binding", async () => {
  vi.mocked(prisma.organization.updateMany).mockResolvedValue({ count: 1 });
  expect((await POST(request({ uasg: "160136", organizationId: "other" }))).status).toBe(200);
  expect(prisma.organization.updateMany).toHaveBeenCalledWith({ where: { id: "session-org", active: true, OR: [{ uasg: null }, { uasg: "160136" }] }, data: { uasg: "160136" } });
});
it("rejects internal codes and non-manager sessions", async () => {
  expect((await POST(request({ uasg: "OP-ALFA" }))).status).toBe(400);
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u", organizationId: "session-org", roles: [] } });
  expect((await POST(request({ uasg: "160136" }))).status).toBe(403);
  expect(prisma.organization.updateMany).not.toHaveBeenCalled();
});
it("preserves existing assignments on conflict", async () => {
  vi.mocked(prisma.organization.updateMany).mockRejectedValue({ code: "P2002" });
  expect((await POST(request({ uasg: "160136" }))).status).toBe(409);
});
