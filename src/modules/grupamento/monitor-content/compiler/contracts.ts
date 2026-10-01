import type { MonitorSlideElement } from "../types";

export const COMPILER_VERSION = 2;
export type Archetype = "COVER" | "CHART_CENTRIC" | "TABLE_CENTRIC" | "DOCUMENT_LIKE" | "IMAGE_FULLFRAME" | "TEXT_CENTRIC" | "MIXED" | "UNKNOWN";
export type RelationType = "contains" | "inside" | "overlaps" | "near" | "annotates" | "labels" | "belongs_to_chart" | "belongs_to_image" | "belongs_to_table" | "unknown_relation";
export type CompilerNode = { id: string; origin: string; nativeId?: string; nativeType?: string; parentId?: string; rotation?: number; nativeMetadata?: Record<string, unknown>; children: string[]; element: MonitorSlideElement; confidence: number };
export type CompilerIssue = { code: string; message: string; nodeIds: string[]; severity: "warning" | "error" };
export type CompilerDiagnostic = {
  version: 2;
  source: { rawHash: string; page: number; structuralHash: string; parserVersion: number };
  parsedInput: { nodes: CompilerNode[]; groups?: Array<{ id: string; parentId?: string; children: string[]; nativeTransform: string }>; sourceStrings: string[]; issues: CompilerIssue[] };
  interpretedContent: {
    archetype: Archetype; confidence: number;
    relations: Array<{ from: string; to: string; type: RelationType; confidence: number }>;
    atomicBlocks: Array<{ type: "ATOMIC_VISUAL_BLOCK"; nodeIds: string[]; reason: string }>;
    protectedTokens: Array<{ source: string; normalized: string; category: string; provenance: string }>;
  };
  normalizedContent: { title: string; elements: MonitorSlideElement[]; paragraphs?: string[]; transformations: Array<{ action: string; reason: string; nodeIds: string[] }> };
  strategy: "DOCUMENT_REFLOW" | "STRUCTURED" | "NATIVE_IMAGE" | "NATIVE_FALLBACK" | "BLOCKED";
  preflight: { status: "PASS" | "BLOCKED"; issues: CompilerIssue[]; inputStrings: number; outputStrings: number; inputObjects: number; outputObjects: number; visual: "PENDING" | "NATIVE_VERIFIED" | "DOM_VERIFIED" };
  nativeReference?: { assetId?: string; assetKey?: string; width: number; height: number; sha256: string; rendererVersion: string; text: string };
  fallbackReason?: string;
  llm: { calls: number; cache: "NOT_NEEDED" | "HIT" | "MISS" | "DISABLED"; model?: string; rejected?: string };
  humanReview?: { outcome: "CORRECT" | "NEEDS_CORRECTION"; at: string; actorId: string };
};

export function compilerBlocked(payload: { inputCompiler?: CompilerDiagnostic }) { return payload.inputCompiler?.preflight.status === "BLOCKED"; }
