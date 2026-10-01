import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), find: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/modules/auth/options", () => ({ authOptions: {} }));
vi.mock("@/server/db", () => ({ prisma: { monitorContentImport: { findFirst: mocks.find } } }));
import { GET } from "@/app/api/grupamento/monitor-content/[importId]/diagnostics/route";
const request = new Request("https://mcl.invalid/api/diagnostics");
const params = { params: Promise.resolve({ importId: "import" }) };
beforeEach(() => { vi.resetAllMocks(); });
describe("compiler diagnostic authorization", () => {
  it("denies unauthenticated access without reading data", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await GET(request, params)).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("denies ordinary monitor viewers", async () => {
    mocks.session.mockResolvedValue({ user: { id: "actor", organizationId: "org", roles: ["COMMAND_VIEWER"] } });
    expect((await GET(request, params)).status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("scopes administrative reads to the session organization", async () => {
    mocks.session.mockResolvedValue({ user: { id: "actor", organizationId: "org", roles: ["ADMIN"] } });
    mocks.find.mockResolvedValue(null);
    expect((await GET(request, params)).status).toBe(404);
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "import", organizationId: "org" } }));
  });
  it("deduplicates multiple output pages from the same source slide", async () => {
    mocks.session.mockResolvedValue({ user: { id: "actor", organizationId: "org", roles: ["LOGISTICS_MANAGER"] } });
    mocks.find.mockResolvedValue({ id: "import", checksum: "raw", status: "PREVIEW", warnings: [], scenes: [1, 2].map(id => ({ id: String(id), sourcePage: 1, payload: { inputCompiler: { source: { slideHash: "one" }, confidence: .9, preflight: { status: "PASS" }, strategy: "REFLOW" } } })) });
    const response = await GET(request, params);
    expect((await response.json()).metrics).toMatchObject({ sourceSlides: 1, confidenceMean: .9, llmCalls: 0 });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
