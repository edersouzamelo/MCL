import type { MonitorDocumentSceneDto } from "./types";

export const MONITOR_CORRECTION_MARKER = "MCL_MONITOR_CORRECTION_V1";

// The last approved corrected deck replaces the displayed sequence. Original
// documents and SAG selections remain stored and return when it is withdrawn.
export function activeMonitorCorrection(scenes: MonitorDocumentSceneDto[]) {
  const latest = scenes.filter(scene => scene.payload.correction?.preserveLayout)
    .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? "") || b.sourceImportedAt.localeCompare(a.sourceImportedAt))[0];
  return latest ? scenes.filter(scene => scene.importId === latest.importId) : null;
}
