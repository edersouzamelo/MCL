export type MonitorDocumentSceneType = "TEXT" | "TABLE" | "CHART" | "FIGURE";

export type MonitorDocumentSeries = {
  name: string;
  categories: string[];
  values: number[];
  color?: string;
  pointColors?: Array<string | null>;
  missingValueIndices?: number[];
  dataLabels?: Array<string | null>;
  dataLabelPositions?: Array<"ctr" | "inEnd" | "inBase" | "outEnd" | "t" | "b" | "l" | "r" | "bestFit" | null>;
};

export type MonitorDocumentChart = {
  title?: string;
  type: "bar" | "line" | "pie" | "doughnut" | "area" | "scatter" | "unknown";
  orientation?: "vertical" | "horizontal";
  grouping?: "clustered" | "stacked" | "percentStacked" | "standard";
  overlap?: number;
  series: MonitorDocumentSeries[];
  valueFormat?: string;
  axisMin?: number;
  axisMax?: number;
  xAxisTitle?: string;
  yAxisTitle?: string;
  legendPosition?: "top" | "bottom" | "left" | "right" | "none";
  semanticVersion?: 3 | 4 | 5;
  categoryFormat?: string;
  categoryReverse?: boolean;
  valueReverse?: boolean;
  majorUnit?: number;
  valueAxisTicks?: number[];
  showGridlines?: boolean;
  gridlineColor?: string;
};

export type MonitorSlideBox = {
  elementId?: string;
  groupId?: string;
  attachedTo?: string;
  locked?: boolean;
  name?: string;
  rotation?: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MonitorSlideTextElement = MonitorSlideBox & {
  kind: "text";
  text: string;
  fontSizePt?: number;
  fontFace?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  color?: string;
  fill?: string;
  lineColor?: string;
  role?: "title" | "metric" | "label" | "body";
  chartAnnotation?: true;
  z: number;
};

export type MonitorSlideImageElement = MonitorSlideBox & {
  kind: "image";
  assetId?: string;
  assetKey?: string;
  fit?: "contain" | "cover";
  opacity?: number;
  z: number;
};

export type MonitorSlideShapeElement = MonitorSlideBox & {
  kind: "shape";
  customGeometry?: { path: string; width: number; height: number };
  shapeType?: "rect" | "roundRect" | "ellipse" | "line" | "arrow";
  lineWidth?: number;
  opacity?: number;
  fill?: string;
  lineColor?: string;
  radius?: number;
  z: number;
};

export type MonitorSlideChartElement = MonitorSlideBox & {
  kind: "chart";
  chart: MonitorDocumentChart;
  z: number;
};

export type MonitorSlideTableElement = MonitorSlideBox & {
  kind: "table";
  columns: string[];
  rows: string[][];
  z: number;
};

export type MonitorSlideElement =
  | MonitorSlideTextElement
  | MonitorSlideImageElement
  | MonitorSlideShapeElement
  | MonitorSlideChartElement
  | MonitorSlideTableElement;

export type MonitorSlideLayout = {
  version: 2;
  width: number;
  height: number;
  elements: MonitorSlideElement[];
};

export type MonitorDocumentScenePayload = {
  inputCompiler?: import("./compiler/contracts").CompilerDiagnostic;
  textDocument?: { version: number };
  onlineEditor?: { version: 1; revision: number; updatedAt?: string; updatedByName?: string; compiledBase?: import("./editor-model").EditorContent; overrides?: import("./editor-model").EditorPatch[] };
  correction?: { version: 1; preserveLayout: true; fullFrame: true };
  extractionVersion?: number;
  layoutVersion?: number;
  layout?: MonitorSlideLayout;
  bullets?: string[];
  rows?: string[][];
  columns?: string[];
  series?: MonitorDocumentSeries[];
  chart?: MonitorDocumentChart;
  assetIds?: string[];
  note?: string;
  searchableText?: string[];
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
  sourceImportedByName: string | null;
  approvedAt: string | null;
};
