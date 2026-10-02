import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  monitorContentImport: { findUnique: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  monitorEditorDraft: { findMany: vi.fn() },
  monitorContentRevision: { create: vi.fn() },
  monitorContentAsset: { createMany: vi.fn(), deleteMany: vi.fn() },
  monitorContentScene: { createMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
}));
vi.mock("@/server/db", () => ({ prisma: db }));
import { persistMonitorContentImport, replaceMonitorContentExtraction, replaceApprovedMonitorContentExtraction } from "@/modules/grupamento/monitor-content/repository";
import type { MonitorDocumentExtraction } from "@/modules/grupamento/monitor-content/types";

const extraction: MonitorDocumentExtraction = {
  scenes: [{ sceneType: "FIGURE", title: "Capa", sourcePage: 1, payload: { layoutVersion: 2, assetKeys: ["cover"] } }],
  assets: [{ key: "cover", fileName: "cover.png", mimeType: "image/png", width: 100, height: 100, data: Buffer.from("media fixture") }],
  warnings: [],
};
const input = { organizationId: "org-test", monitorId: 8, fileName: "test.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from("source fixture"), importedBy: "operator-test", extraction };

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (work) => work(db));
  db.monitorContentImport.findUnique.mockResolvedValue(null);
  db.monitorContentImport.findFirst.mockResolvedValue({ id: "import-test", status: "APPROVED" });
  db.monitorContentImport.findUniqueOrThrow.mockResolvedValue({ id: "import-test", scenes: [] });
  db.monitorContentImport.update.mockResolvedValue({ id: "import-test", scenes: [] });
  db.monitorContentScene.findMany.mockResolvedValue([]);
  db.monitorEditorDraft.findMany.mockResolvedValue([]);
});

describe("atomic document persistence", () => {
  it("keeps the original and media but does not read the binary back in the transaction", async () => {
    await persistMonitorContentImport(input);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 10000, timeout: 30000 });
    const created = db.monitorContentImport.create.mock.calls[0][0];
    expect(Buffer.from(created.data.rawFile)).toEqual(input.buffer);
    expect(created.data.status).toBe("PREVIEW");
    expect(created.select).toEqual({ id: true });
    expect(Buffer.from(db.monitorContentAsset.createMany.mock.calls[0][0].data[0].data)).toEqual(extraction.assets[0].data);
    const scene = db.monitorContentScene.createMany.mock.calls[0][0].data[0];
    expect(scene.payload.assetIds[0]).toBe(db.monitorContentAsset.createMany.mock.calls[0][0].data[0].id);
    expect(db.monitorContentImport.findUniqueOrThrow.mock.calls[0][0].select.rawFile).toBeUndefined();
  });
  it("propagates a write failure and never returns a successful import", async () => {
    db.monitorContentAsset.createMany.mockRejectedValue(new Error("database write failed"));
    await expect(persistMonitorContentImport(input)).rejects.toThrow("database write failed");
    expect(db.monitorContentScene.createMany).not.toHaveBeenCalled();
    expect(db.monitorContentImport.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it("uses the same bounded budget for reprocessing and preserves approved-update isolation", async () => {
    await replaceMonitorContentExtraction({ id: "import-test", organizationId: "org-test", actorId: "operator-test", extraction });
    expect(db.$transaction.mock.calls[0][1]).toEqual({ maxWait: 10000, timeout: 30000 });
    await replaceApprovedMonitorContentExtraction({ id: "import-test", organizationId: "org-test", extraction });
    expect(db.$transaction.mock.calls[1][1]).toEqual({ maxWait: 10000, timeout: 30000, isolationLevel: "Serializable" });
  });
  it("deduplicates an existing preview without loading its original or rewriting its media", async () => {
    db.monitorContentImport.findUnique.mockResolvedValue({ id: "existing", status: "PREVIEW", scenes: [] });
    expect((await persistMonitorContentImport(input)).deduplicated).toBe(true);
    expect(db.monitorContentImport.findUnique.mock.calls[0][0].select.rawFile).toBeUndefined();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
