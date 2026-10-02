import { beforeEach, describe, it, expect, vi } from "vitest";
import type {
  MonitorDocumentSceneDto,
  MonitorSlideElement,
} from "../../src/modules/grupamento/monitor-content/types";
import {
  diffContent,
  type EditorContent,
} from "../../src/modules/grupamento/monitor-content/editor-model";
const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  monitorContentScene: { findFirst: vi.fn(), updateMany: vi.fn() },
  monitorContentAsset: { count: vi.fn() },
  monitorContentRevision: { create: vi.fn(), findMany: vi.fn() },
  monitorEditorDraft: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
}));
vi.mock("@/server/db", () => ({ prisma: db }));
import {
  saveEditorDrafts,
  publishEditorDrafts,
  getEditorDrafts,
} from "../../src/modules/grupamento/monitor-content/editor-draft-repository";
const id = "123e4567-e89b-42d3-a456-426614174000";
const access = {
  organizationId: "org",
  monitorId: 1,
  actorId: "actor",
  actorName: "Operador",
};
const text: MonitorSlideElement = {
  kind: "text",
  elementId: "text",
  text: "Texto original",
  x: 0.15,
  y: 0.2,
  w: 0.5,
  h: 0.4,
  z: 1,
  fontSizePt: 24,
};
const shape: MonitorSlideElement = {
  kind: "shape",
  elementId: "shape",
  x: 0.15,
  y: 0.2,
  w: 0.5,
  h: 0.4,
  z: 0,
  fill: "#ffffff",
};
const row = {
  id,
  importId: id,
  active: true,
  title: "Rio de Janeiro",
  payload: {
    onlineEditor: { version: 1, revision: 0 },
    layoutVersion: 2,
    layout: {
      version: 2,
      width: 12192000,
      height: 6858000,
      elements: [text, shape],
    },
  },
};
const base: EditorContent = { title: row.title, elements: [text, shape] };
const edited: EditorContent = {
  title: "Título manual",
  elements: [
    { ...text, x: 0.2222222222 },
    { ...shape, x: 0.2222222222 },
  ],
};
const draft = {
  id: "draft",
  sceneId: id,
  importId: id,
  actorId: "actor",
  baseRevision: 0,
  revision: 1,
  base,
  patches: diffContent(base, edited),
};
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((callback) => callback(db));
  db.monitorContentScene.findFirst.mockResolvedValue(structuredClone(row));
  db.monitorContentScene.updateMany.mockResolvedValue({ count: 1 });
  db.monitorContentAsset.count.mockResolvedValue(0);
  db.monitorEditorDraft.findUnique.mockResolvedValue(null);
  db.monitorEditorDraft.findFirst.mockResolvedValue(structuredClone(draft));
  db.monitorEditorDraft.updateMany.mockResolvedValue({ count: 1 });
});
describe("draft/publication repository", () => {
  it("saving a draft never mutates the published scene, original or publication audit", async () => {
    await saveEditorDrafts({
      ...access,
      value: { scenes: [{ id, revision: 0, draftRevision: 0, ...edited }] },
    });
    expect(db.monitorEditorDraft.create).toHaveBeenCalledOnce();
    expect(db.monitorContentScene.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
    expect(
      db.monitorContentScene.findFirst.mock.calls[0][0].where.import,
    ).toEqual({ organizationId: "org", monitorId: 1, status: "APPROVED" });
  });
  it("publishes the exact manual overlap and retains base/overrides in one transaction", async () => {
    await publishEditorDrafts({
      ...access,
      scenes: [{ id, draftRevision: 1 }],
    });
    const change = db.monitorContentScene.updateMany.mock.calls[0][0];
    expect(change.data.payload.layout.elements).toEqual(edited.elements);
    expect(change.data.payload.onlineEditor.compiledBase).toEqual(base);
    expect(change.data.payload.onlineEditor.overrides).toEqual(
      diffContent(base, edited),
    );
    expect(db.monitorEditorDraft.deleteMany).toHaveBeenCalledOnce();
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.monitorContentRevision.create).toHaveBeenCalledOnce();
    expect(change.data.title).toBe(edited.title);
  });
  it("safe rebase preserves a compiler text improvement and the manual position", async () => {
    db.monitorContentScene.findFirst.mockResolvedValue({
      ...row,
      payload: {
        ...row.payload,
        onlineEditor: { version: 1, revision: 1 },
        layout: {
          ...row.payload.layout,
          elements: [{ ...text, text: "Texto novo do compiler" }, shape],
        },
      },
    });
    await publishEditorDrafts({
      ...access,
      scenes: [{ id, draftRevision: 1 }],
    });
    expect(
      db.monitorContentScene.updateMany.mock.calls[0][0].data.payload.layout
        .elements[0],
    ).toMatchObject({ text: "Texto novo do compiler", x: 0.2222222222 });
  });
  it("conflict does not remove the draft or write a new publication", async () => {
    db.monitorContentScene.findFirst.mockResolvedValue({
      ...row,
      payload: {
        ...row.payload,
        onlineEditor: { version: 1, revision: 1 },
        layout: {
          ...row.payload.layout,
          elements: [{ ...text, x: 0.9 }, shape],
        },
      },
    });
    await expect(
      publishEditorDrafts({ ...access, scenes: [{ id, draftRevision: 1 }] }),
    ).rejects.toThrow("mudou");
    expect(db.monitorContentScene.updateMany).not.toHaveBeenCalled();
    expect(db.monitorEditorDraft.deleteMany).not.toHaveBeenCalled();
  });
  it("prevents stale draft writers across tabs", async () => {
    db.monitorEditorDraft.findUnique.mockResolvedValue({
      ...draft,
      revision: 2,
    });
    await expect(
      saveEditorDrafts({
        ...access,
        value: { scenes: [{ id, revision: 0, draftRevision: 1, ...edited }] },
      }),
    ).rejects.toThrow("outra aba");
    expect(db.monitorEditorDraft.updateMany).not.toHaveBeenCalled();
  });
  it("scopes draft reads to actor, organization and monitor", async () => {
    db.monitorEditorDraft.findMany.mockResolvedValue([draft]);
    const result = await getEditorDrafts(access);
    expect(db.monitorEditorDraft.findMany.mock.calls[0][0].where).toEqual({
      actorId: "actor",
      import: { organizationId: "org", monitorId: 1, status: "APPROVED" },
    });
    expect(result[0].content).toEqual(edited);
  });
  it("rejects images from a different import even in a draft", async () => {
    await expect(
      saveEditorDrafts({
        ...access,
        value: {
          scenes: [
            {
              id,
              revision: 0,
              draftRevision: 0,
              title: base.title,
              elements: [
                {
                  kind: "image",
                  elementId: "image",
                  assetId: id,
                  x: 0,
                  y: 0,
                  w: 1,
                  h: 1,
                  z: 1,
                },
              ],
            },
          ],
        },
      }),
    ).rejects.toThrow("não pertence");
  });
  it("reopening a published payload keeps the exact coordinates", async () => {
    await publishEditorDrafts({
      ...access,
      scenes: [{ id, draftRevision: 1 }],
    });
    const payload = db.monitorContentScene.updateMany.mock.calls[0][0].data
      .payload as MonitorDocumentSceneDto["payload"];
    expect(payload.layout!.elements[0].x).toBe(0.2222222222);
    expect(payload.layout!.elements[1].x).toBe(0.2222222222);
  });
});
