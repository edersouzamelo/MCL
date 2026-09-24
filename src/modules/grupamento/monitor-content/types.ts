export type MonitorDocumentSceneType = "TEXT" | "TABLE" | "CHART" | "FIGURE";

export type MonitorDocumentSeries = {
  name: string;
  categories: string[];
  values: number[];
};

export type MonitorDocumentScenePayload = {
  bullets?: string[];
  rows?: string[][];
  columns?: string[];
  series?: MonitorDocumentSeries[];
  assetIds?: string[];
  note?: string;
};

export type MonitorDocumentSceneDraft = {
  sceneType: MonitorDocumentSceneType;
  title: string;
  payload: MonitorDocumentScenePayload & { assetKeys?: string[] };
  sourcePage?: number;
};

export type MonitorDocumentAssetDraft = {
  key: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  data: Buffer;
};

export type MonitorDocumentExtraction = {
  scenes: MonitorDocumentSceneDraft[];
  assets: MonitorDocumentAssetDraft[];
  warnings: string[];
};

export type MonitorDocumentSceneDto = {
  id: string;
  importId: string;
  monitorId: number;
  sceneOrder: number;
  sceneType: MonitorDocumentSceneType;
  title: string;
  payload: MonitorDocumentScenePayload;
  sourcePage: number | null;
  sourceFileName: string;
  sourceImportedAt: string;
  approvedAt: string | null;
};
