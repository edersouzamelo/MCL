import type { MonitorDocumentExtraction, MonitorDocumentScenePayload } from "./types";
import { TEXT_DOCUMENT_VERSION } from "./text-document";

export const CURRENT_MONITOR_EXTRACTION_VERSION = 7;

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

export function monitorSceneNeedsRefresh(scene: { payload: MonitorDocumentScenePayload; sourceFileName?: string }) {
  if (scene.payload.onlineEditor) return false;
  const textSource = /\.(?:docx|pdf|txt)$/i.test(scene.sourceFileName ?? "");
  return scene.payload.extractionVersion !== CURRENT_MONITOR_EXTRACTION_VERSION
    || (textSource && scene.payload.textDocument?.version !== TEXT_DOCUMENT_VERSION);
}
