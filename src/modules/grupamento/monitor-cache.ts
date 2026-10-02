import type { CcoMonitorConfig } from "./monitor";
import { parseCcoMonitorConfig } from "./monitor";
import type { SagImportResult } from "./sag";
import type { RpnImportResult } from "./rpn";
import type { MonitorDocumentSceneDto } from "./monitor-content/types";
import { OM_CREST_CATALOG } from "./om-crests";

export const MONITOR_ASSET_CACHE = "mcl-monitor-assets-v4";
const SNAPSHOT_CACHE = "mcl-monitor-snapshots-v4";

export type MonitorRemoteState = {
  stateVersion: string;
  deploymentVersion: string;
};

export type MonitorSnapshot = {
  schemaVersion: 4;
  version: string;
  stateVersion?: string;
  savedAt: string;
  organizationId: string;
  monitorId: number;
  monitor: CcoMonitorConfig;
  sag: SagImportResult | null;
  rpn: RpnImportResult | null;
  scenes: MonitorDocumentSceneDto[];
  assets: string[];
};

function snapshotKey(organizationId: string, monitorId: number) {
  return `/grupamento/monitor/${monitorId}/local-snapshot?organization=${encodeURIComponent(organizationId)}`;
}

export function sceneAssetUrls(scenes: MonitorDocumentSceneDto[]) {
  return [...new Set(scenes.flatMap((scene) => [
    ...(scene.payload.assetIds ?? []),
    ...(scene.payload.layout?.elements ?? []).flatMap((element) => element.kind === "image" && element.assetId ? [element.assetId] : []),
  ]))].map((id) => `/api/grupamento/monitor-content/assets/${encodeURIComponent(id)}`);
}

export function validatePlaylist(payload: unknown, monitorId: number): MonitorDocumentSceneDto[] {
  const scenes = (payload as { scenes?: unknown } | null)?.scenes;
  if (!Array.isArray(scenes) || scenes.some((scene) => !scene || typeof scene.id !== "string" || scene.monitorId !== monitorId || !scene.approvedAt || !scene.payload || typeof scene.payload !== "object")) {
    throw new Error("Playlist inválida ou sem aprovação registrada.");
  }
  return scenes;
}

async function networkJson(url: string) {
  const response = await fetch(url, { cache: "no-store", headers: { "X-MCL-Revalidate": "1" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok || response.redirected) throw new Error(`Sincronização recusada: HTTP ${response.status}`);
  return response.json();
}

export async function readMonitorRemoteState(monitorId: number): Promise<MonitorRemoteState> {
  const value = await networkJson(`/api/grupamento/monitor-state?monitorId=${monitorId}`);
  if (!value || typeof value.stateVersion !== "string" || value.stateVersion.length < 8 || typeof value.deploymentVersion !== "string") {
    throw new Error("Estado remoto do monitor inválido.");
  }
  return { stateVersion: value.stateVersion, deploymentVersion: value.deploymentVersion };
}

export async function readMonitorSnapshot(organizationId: string, monitorId: number): Promise<MonitorSnapshot | null> {
  try {
    const response = await (await caches.open(SNAPSHOT_CACHE)).match(snapshotKey(organizationId, monitorId));
    if (!response) return null;
    const value = await response.json() as MonitorSnapshot;
    if (value.schemaVersion !== 4 || value.organizationId !== organizationId || value.monitorId !== monitorId) return null;
    validatePlaylist({ scenes: value.scenes }, monitorId);
    return value;
  } catch (error) {
    console.warn("MCL monitor: snapshot local indisponível", error);
    return null;
  }
}

export async function forgetMonitorSnapshot(organizationId: string, monitorId: number) {
  await (await caches.open(SNAPSHOT_CACHE)).delete(snapshotKey(organizationId, monitorId));
}

export async function synchronizeMonitor(
  organizationId: string,
  monitor: CcoMonitorConfig,
  previous: MonitorSnapshot | null = null,
  stateVersion = previous?.stateVersion ?? "unspecified",
) {
  const [financialResult, playlistResult, configResult] = await Promise.allSettled([
    networkJson(`/api/grupamento/sag/latest?monitorId=${monitor.id}`),
    networkJson(`/api/grupamento/monitor-content/playlist?monitorId=${monitor.id}`),
    networkJson(`/api/grupamento/monitors?monitorId=${monitor.id}`),
  ]);
  if (playlistResult.status === "rejected") throw playlistResult.reason;
  if (configResult.status === "rejected") throw configResult.reason;

  const sharedMonitor = parseCcoMonitorConfig(configResult.value?.monitors?.find?.((item: CcoMonitorConfig) => item.id === monitor.id), monitor.id);
  if (!sharedMonitor) throw new Error("Configuração compartilhada do monitor inválida.");

  const playlist = playlistResult.value;
  if (financialResult.status === "rejected" && !previous) throw financialResult.reason;
  const financial = financialResult.status === "fulfilled" ? financialResult.value : { current: previous?.sag, rpn: previous?.rpn };
  let scenes = validatePlaylist(playlist, monitor.id);

  // Null means no published source; malformed responses must never replace a snapshot.
  if (!("current" in financial) || !("rpn" in financial)) throw new Error("Resposta SAG incompleta.");
  for (const result of [financial.current, financial.rpn]) {
    if (result !== null && (!result || !result.totals || !Array.isArray(result.byUg) || !Array.isArray(result.byPi) || !Array.isArray(result.rows))) throw new Error("Snapshot SAG inválido.");
  }

  let assets = sceneAssetUrls(scenes);
  // Small, versioned official catalog: prepare every shield before offline use,
  // including units that only appear on later pages or documentary tables.
  const crestUrls = OM_CREST_CATALOG.units.map((unit) => unit.image);
  const assetCache = await caches.open(MONITOR_ASSET_CACHE);

  // All assets finish before the single snapshot pointer is committed.
  try {
    for (let start = 0; start < assets.length; start += 4) {
      await Promise.all(assets.slice(start, start + 4).map(async (url) => {
        if (await assetCache.match(url)) return;
        const response = await fetch(url, { cache: "no-store", headers: { "X-MCL-Revalidate": "1" }, signal: AbortSignal.timeout(12000) });
        if (!response.ok || response.redirected || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Asset indisponível: ${url}`);
        await assetCache.put(url, response);
      }));
    }
  } catch (error) {
    const approvedIds = new Set(scenes.map((scene) => scene.id));
    if (!previous?.scenes.some((scene) => !approvedIds.has(scene.id))) throw error;
    // A failed new asset cannot keep a revoked document on the screen.
    const cachedIds = new Set(previous.scenes.map((scene) => scene.id));
    scenes = scenes.filter((scene) => cachedIds.has(scene.id));
    assets = sceneAssetUrls(scenes);
  }

  // Decoration must never prevent a financial refresh or keep a revoked scene.
  const crestSignal = AbortSignal.timeout(3000);
  for (let start = 0; start < crestUrls.length; start += 4) {
    await Promise.allSettled(crestUrls.slice(start, start + 4).map(async (url) => {
      if (await assetCache.match(url)) return;
      const response = await fetch(url, { headers: { "X-MCL-Revalidate": "1" }, signal: crestSignal });
      if (response.ok && !response.redirected && response.headers.get("content-type")?.startsWith("image/")) await assetCache.put(url, response);
    }));
  }

  const data = { organizationId, monitorId: monitor.id, monitor: sharedMonitor, sag: financial.current, rpn: financial.rpn, scenes, assets };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ data, stateVersion })));
  const version = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const snapshot: MonitorSnapshot = { ...data, schemaVersion: 4, version, stateVersion, savedAt: new Date().toISOString() };
  await (await caches.open(SNAPSHOT_CACHE)).put(snapshotKey(organizationId, monitor.id), new Response(JSON.stringify(snapshot), { headers: { "Content-Type": "application/json" } }));
  return snapshot;
}

export async function prepareMonitorNavigation(monitorId: number) {
  if (!("serviceWorker" in navigator)) throw new Error("Navegador sem suporte a abertura offline.");
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker ainda indisponível.")), 10000)),
  ]);
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error("Preparação offline pendente.")); }, 30000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data.ok) resolve(); else reject(new Error(event.data.error));
    };
    registration.active?.postMessage({ type: "MCL_PREPARE_MONITOR", path: `/grupamento/monitor/${monitorId}`, resources: performance.getEntriesByType("resource").map((entry) => entry.name) }, [channel.port2]);
  });
}
