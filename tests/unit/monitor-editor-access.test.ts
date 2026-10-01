import { describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: session }));
vi.mock("@/modules/auth/options", () => ({ authOptions: {} }));
import { editorAccess } from "../../src/modules/grupamento/monitor-content/editor-access";
describe("permissão do editor", () => {
  it("exige autenticação", async () => { session.mockResolvedValue(null); expect((await editorAccess("1")).error?.status).toBe(401); });
  it("recusa visualizadores", async () => { session.mockResolvedValue({ user: { id: "actor", organizationId: "org", roles: ["COMMAND_VIEWER"] } }); expect((await editorAccess("1")).error?.status).toBe(403); });
  it("exige organização e monitor válido", async () => { session.mockResolvedValue({ user: { id: "actor", roles: ["ADMIN"] } }); expect((await editorAccess("1")).error?.status).toBe(422); session.mockResolvedValue({ user: { id: "actor", organizationId: "org", roles: ["ADMIN"] } }); expect((await editorAccess("11")).error?.status).toBe(400); });
  it("autoriza gestores na própria organização", async () => { session.mockResolvedValue({ user: { id: "actor", organizationId: "org", roles: ["LOGISTICS_MANAGER"] } }); expect(await editorAccess("6")).toMatchObject({ monitorId: 6, user: { organizationId: "org" } }); });
});
