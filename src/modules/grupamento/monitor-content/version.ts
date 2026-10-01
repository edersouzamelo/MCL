import type { MonitorDocumentExtraction, MonitorDocumentSceneDto, MonitorDocumentScenePayload } from "./types";

export const CURRENT_MONITOR_EXTRACTION_VERSION = 5;

export function stampMonitorExtraction(extraction: MonitorDocumentExtraction): MonitorDocumentExtraction {
  return {
    ...extraction,
    scenes: extraction.scenes.map((scene) => ({
      ...scene,
      payload: {
        ...scene.payload,
        extractionVersion: CURRENT_MONITOR_EXTRACTION_VERSION,
      },
    })),
  };
}

export function monitorSceneNeedsRefresh(scene: Pick<MonitorDocumentSceneDto, "payload"> | { payload: MonitorDocumentScenePayload }) {
  return !scene.payload.onlineEditor && scene.payload.extractionVersion !== CURRENT_MONITOR_EXTRACTION_VERSION;
}
