import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ access: vi.fn(), find: vi.fn(), create: vi.fn() }));
vi.mock("@/modules/grupamento/monitor-content/editor-access", () => ({ editorAccess: mocks.access }));
vi.mock("@/server/db", () => ({ prisma: { monitorContentScene: { findFirst: mocks.find }, monitorContentAsset: { create: mocks.create } } }));
import { POST } from "../../src/app/api/grupamento/monitors/[monitorId]/editor/images/route";
const options = { params: Promise.resolve({ monitorId: "1" }) };
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ monitorId: 1, user: { id: "actor", organizationId: "org" } }); mocks.find.mockResolvedValue({ importId: "own-document" }); mocks.create.mockImplementation(async ({ data }) => data); });
async function upload(data: Uint8Array, name: string, type: string) { const form = new FormData(); form.set("file", new File([data as BlobPart], name, { type })); form.set("sceneId", "scene"); return POST(new Request("http://localhost/api/editor/images", { method: "POST", body: form }), options); }
describe("imagem do editor", () => {
  it("decodifica e converte uma imagem real, vinculando-a ao documento aprovado", async () => {
    const data = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#0284c7" } }).png().toBuffer();
    const response = await upload(new Uint8Array(data), "imagem.png", "image/png"); expect(response.status).toBe(200);
    const asset = mocks.create.mock.calls[0][0].data; expect(asset.importId).toBe("own-document"); expect(asset.mimeType).toBe("image/webp"); expect((await sharp(asset.data).metadata()).format).toBe("webp");
    expect(mocks.find.mock.calls[0][0].where.import).toEqual({ organizationId: "org", monitorId: 1, status: "APPROVED" });
  });
  it("recusa SVG e bytes inválidos mesmo declarados PNG", async () => { expect((await upload(new TextEncoder().encode('<svg onload="alert(1)"></svg>'), "unsafe.png", "image/png")).status).toBe(400); expect(mocks.create).not.toHaveBeenCalled(); });
  it("recusa imagens sem documento acessível", async () => { mocks.find.mockResolvedValue(null); expect((await upload(new Uint8Array([1]), "test.png", "image/png")).status).toBe(404); expect(mocks.create).not.toHaveBeenCalled(); });
  it("recusa cargas excessivas antes de ler o arquivo", async () => { const response = await POST(new Request("http://localhost/api/editor/images", { method: "POST", headers: { "Content-Length": "5000000" } }), options); expect(response.status).toBe(413); expect(mocks.find).not.toHaveBeenCalled(); });
});
