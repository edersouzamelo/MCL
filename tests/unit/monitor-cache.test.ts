import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readMonitorSnapshot, sceneAssetUrls, synchronizeMonitor, validatePlaylist } from "@/modules/grupamento/monitor-cache";
import { defaultCcoMonitorConfig } from "@/modules/grupamento/monitor";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";

const scene: MonitorDocumentSceneDto = { id: "test-scene", monitorId: 1, importId: "test-import", sceneOrder: 0, sceneType: "FIGURE", title: "FIXTURE DE TESTE", payload: { assetIds: ["test-image"] }, sourcePage: 1, sourceFileName: "fixture.pptx", sourceImportedAt: "2026-09-25", approvedAt: "2026-09-25" };
const monitor = defaultCcoMonitorConfig()[0];
let failAsset = false;
let failApi = false;
let scenes = [scene];
beforeEach(() => {
  failAsset = false; failApi = false; scenes = [scene];
  const stores = new Map<string, Map<string, Response>>();
  vi.stubGlobal("caches", { open: async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return { match: async (key: string) => store.get(key)?.clone(), put: async (key: string, value: Response) => { store.set(key, value.clone()); } };
  } });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("/assets/")) return new Response("test image bytes", { status: failAsset ? 503 : 200, headers: { "Content-Type": "image/png" } });
    if (failApi) return new Response("unavailable", { status: 503 });
    return Response.json(url.includes("playlist") ? { scenes } : { current: null, rpn: null });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("atomic monitor cache", () => {
  it("stores versioned approved payloads and isolates organizations", async () => {
    const snapshot = await synchronizeMonitor("org-a", monitor);
    expect(snapshot.version).toHaveLength(64);
    expect((await readMonitorSnapshot("org-a", 1))?.scenes).toEqual([scene]);
    expect(await readMonitorSnapshot("org-b", 1)).toBeNull();
    expect((await synchronizeMonitor("org-a", monitor)).version).toBe(snapshot.version);
  });
  it("keeps previous complete playlist when a new asset fails", async () => {
    const old = await synchronizeMonitor("org-a", monitor);
    scenes = [{ ...scene, id: "next", payload: { assetIds: ["next-image"] } }]; failAsset = true;
    await expect(synchronizeMonitor("org-a", monitor)).rejects.toThrow("Asset");
    expect((await readMonitorSnapshot("org-a", 1))?.version).toBe(old.version);
  });
  it("retains the snapshot on API failure and accepts an explicitly empty approved playlist", async () => {
    const old = await synchronizeMonitor("org-a", monitor);
    failApi = true;
    await expect(synchronizeMonitor("org-a", monitor)).rejects.toThrow("503");
    expect((await readMonitorSnapshot("org-a", 1))?.version).toBe(old.version);
    failApi = false; scenes = [];
    expect((await synchronizeMonitor("org-a", monitor)).scenes).toEqual([]);
  });
  it("rejects malformed and unapproved playlists instead of silently replacing them", () => {
    expect(() => validatePlaylist({}, 1)).toThrow();
    expect(() => validatePlaylist({ scenes: [{ ...scene, approvedAt: null }] }, 1)).toThrow();
    expect(() => validatePlaylist({ scenes: [scene] }, 2)).toThrow();
    expect(sceneAssetUrls([scene, scene])).toHaveLength(1);
  });
});
