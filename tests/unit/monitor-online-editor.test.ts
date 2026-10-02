import { describe, expect, it, vi, beforeEach } from "vitest";
import { editorSaveSchema, prepareEditorScene, optimizeEditorElements, chartWithoutColors } from "../../src/modules/grupamento/monitor-content/online-editor";
import { monitorSceneNeedsRefresh } from "../../src/modules/grupamento/monitor-content/version";
import type { MonitorDocumentSceneDto, MonitorSlideElement } from "../../src/modules/grupamento/monitor-content/types";
const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), count: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { $transaction: mocks.transaction } }));
import { saveOnlineMonitorScenes, EditorConflict } from "../../src/modules/grupamento/monitor-content/online-editor-repository";
const id = "123e4567-e89b-42d3-a456-426614174000";
const text: MonitorSlideElement = { kind: "text", text: "Conteúdo", x: .1, y: .3, w: .8, h: .5, z: 1 };
const scene = { id, importId: id, monitorId: 1, sceneOrder: 1, sceneType: "TEXT", title: "TÍTULO DO SAG", payload: { layoutVersion: 2, layout: { version: 2, width: 12192000, height: 6858000, elements: [text] } }, sourcePage: 1, sourceFileName: "documento.pptx", sourceImportedAt: "2026-10-01", sourceImportedByName: "Operador", approvedAt: "2026-10-01" } satisfies MonitorDocumentSceneDto;
const input = (elements: MonitorSlideElement[] = [text]) => ({ organizationId: "org", monitorId: 1, actorId: "actor", actorName: "Operador", value: { scenes: [{ id, revision: 0, title: "NÃO PODER ESCREVER-ASSIM", elements }] } });
beforeEach(() => {
  vi.clearAllMocks(); mocks.find.mockResolvedValue({ ...scene, active: true }); mocks.update.mockResolvedValue({ count: 1 }); mocks.count.mockResolvedValue(0);
  mocks.transaction.mockImplementation(async callback => callback({ monitorContentScene: { findFirst: mocks.find, updateMany: mocks.update }, monitorContentAsset: { count: mocks.count }, auditLog: { create: mocks.audit } }));
});
describe("editor documental", () => {
  it("preserva o título manual e original e registra auditoria no mesmo salvamento", async () => {
    await saveOnlineMonitorScenes(input());
    const update = mocks.update.mock.calls[0][0];
    expect(update.data.title).toBe("NÃO PODER ESCREVER-ASSIM"); expect(update.data.payload.onlineEditor).toMatchObject({ revision: 1, updatedByName: "Operador" });
    expect(update.where.payload.equals).toEqual(scene.payload); expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.find.mock.calls[0][0].where.import).toEqual({ organizationId: "org", monitorId: 1, status: "APPROVED" });
    expect(mocks.audit.mock.calls[0][0].data.metadata.before.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.audit.mock.calls[0][0].data.metadata.after.revision).toBe(1);
  });
  it("recusa edição desatualizada e não escreve", async () => {
    mocks.find.mockResolvedValue({ ...scene, payload: { ...scene.payload, onlineEditor: { version: 1, revision: 1 } } });
    await expect(saveOnlineMonitorScenes(input())).rejects.toBeInstanceOf(EditorConflict); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("recusa assets de outro documento", async () => {
    await expect(saveOnlineMonitorScenes(input([{ kind: "image", assetId: id, x: 0, y: 0, w: 1, h: 1, z: 1 }]))).rejects.toThrow("Imagem não pertence"); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("permite cores dos gráficos, impede adulterar valores", async () => {
    const chart: MonitorSlideElement = { kind: "chart", x: 0, y: 0, w: 1, h: 1, z: 1, chart: { type: "bar", series: [{ name: "Crédito", categories: ["UG"], values: [42], color: "#000000" }] } };
    mocks.find.mockResolvedValue({ ...scene, payload: { ...scene.payload, layout: { ...scene.payload.layout, elements: [chart] } } });
    const recolored = structuredClone(chart); recolored.chart.series[0].color = "#ff0000";
    await saveOnlineMonitorScenes(input([recolored])); expect(mocks.update).toHaveBeenCalledOnce();
    recolored.chart.series[0].values[0] = 43;
    await expect(saveOnlineMonitorScenes(input([recolored]))).rejects.toThrow("preservando seus dados");
    expect(chartWithoutColors(chart.chart)).toEqual(chartWithoutColors({ ...chart.chart, series: [{ ...chart.chart.series[0], color: "#ff0000" }] }));
  });
  it("detecta corrida no banco sem criar auditoria de sucesso", async () => {
    mocks.update.mockResolvedValue({ count: 0 }); await expect(saveOnlineMonitorScenes(input())).rejects.toBeInstanceOf(EditorConflict); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("protege papel de título, fontes, valores não finitos e cores inválidas", () => {
    for (const patch of [{ role: "title" }, { fontFace: "Comic Sans" }, { x: Infinity }, { color: "url(javascript:alert(1))" }]) expect(editorSaveSchema.safeParse({ scenes: [{ id, revision: 0, title: "Tela", elements: [{ ...text, ...patch }] }] }).success).toBe(false);
  });
  it("converte coordenadas apenas uma vez e protege a versão editada de reextração", () => {
    const prepared = prepareEditorScene(scene); expect(prepareEditorScene(prepared)).toEqual(prepared); expect(monitorSceneNeedsRefresh(prepared)).toBe(false); expect(scene.payload).not.toHaveProperty("onlineEditor");
  });
  it("permite atualizar bases antigas com overrides, mantendo a proteção legada", () => {
    const prepared = prepareEditorScene(scene);
    prepared.payload.onlineEditor = { ...prepared.payload.onlineEditor!, compiledBase: { title: prepared.title, elements: prepared.payload.layout!.elements }, overrides: [] };
    expect(monitorSceneNeedsRefresh(prepared)).toBe(true);
    prepared.payload.extractionVersion = 7;
    expect(monitorSceneNeedsRefresh(prepared)).toBe(false);
  });
  it("contém os objetos, resolve painéis sobrepostos e não perde conteúdo", () => {
    const elements: MonitorSlideElement[] = [{ kind: "image", assetId: id, x: -.5, y: -.4, w: .7, h: .7, z: 1 }, { kind: "table", columns: ["UG"], rows: [["42"]], x: .2, y: .2, w: .7, h: .7, z: 2 }];
    const optimized = optimizeEditorElements(elements); expect(optimized).toHaveLength(2); expect(optimized.every(value => value.x >= 0 && value.y >= 0 && value.x + value.w <= 1 && value.y + value.h <= 1)).toBe(true); expect(optimized[0].x + optimized[0].w).toBeLessThan(optimized[1].x); expect(elements[0].x).toBe(-.5);
  });
});
