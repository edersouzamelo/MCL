import type { MonitorDocumentExtraction, MonitorDocumentSceneDraft } from "../types";
import { createHash } from "node:crypto";
import { compilerHash, compileSlide, missingTokens } from "./scene-graph";
import { renderNativeDocument, type NativeRenderer } from "./native-renderer";
import type { CompilerDiagnostic, CompilerIssue } from "./contracts";

export async function finalizeCompilation(buffer: Buffer, format: string, extraction: MonitorDocumentExtraction, renderer: NativeRenderer = renderNativeDocument) {
  const rawHash = createHash("sha256").update(buffer).digest("hex");
  // TXT already has an exact document model; no native conversion is needed.
  for (const [index, scene] of extraction.scenes.entries()) if (!scene.payload.inputCompiler) {
    const paragraphs = scene.payload.bullets ?? [];
    const elements = scene.payload.layout?.elements ?? paragraphs.map((text, i) => ({ kind: "text" as const, text, x: .02, y: .02 + i / Math.max(1, paragraphs.length), w: .96, h: .96 / Math.max(1, paragraphs.length), z: i, role: "body" as const }));
    const diagnostic = compileSlide({ elements, title: scene.title, page: scene.sourcePage ?? index + 1, rawHash, structuralHash: compilerHash({ rawHash, scene }) });
    if (scene.payload.rows || scene.payload.chart || scene.payload.assetKeys?.length || format !== "txt") {
      diagnostic.strategy = "BLOCKED";
      diagnostic.preflight.status = "BLOCKED";
      diagnostic.fallbackReason = "Documento com composição nativa; a extração textual isolada não comprova integridade visual.";
    }
    // Heading is part of the explicit document model, even when not repeated in
    // bullets. Its paragraphs must not be removed by a slide title heuristic.
    if (format === "txt") {
      diagnostic.strategy = "DOCUMENT_REFLOW"; diagnostic.normalizedContent.title = scene.title;
      diagnostic.normalizedContent.paragraphs = paragraphs; diagnostic.preflight.status = "PASS";
    }
    scene.payload.inputCompiler = diagnostic;
  }
  if (!["pptx", "docx", "pdf"].includes(format)) return extraction;
  const needsNative = extraction.scenes.some(scene => scene.payload.inputCompiler?.strategy === "BLOCKED");
  // Native references also enable runtime overflow fallback for simple scenes.
  if (!needsNative && !process.env.MCL_NATIVE_RENDERER_URL && !process.env.VERCEL_OIDC_TOKEN && process.env.VERCEL !== "1" && renderer === renderNativeDocument) return extraction;
  try {
    const pages = await renderer(buffer, format as "pptx" | "docx" | "pdf");
    if (format === "pptx" && pages.length !== extraction.scenes.length) throw new Error("A quantidade de slides nativos difere da extração estrutural.");
    const sourceScenes = extraction.scenes;
    if (format !== "pptx") {
      // Use each original page once; text/figure extraction may have produced
      // several scenes for one page. Preserve those parses inside the diagnostic.
      extraction.scenes = pages.map(page => {
        const source = sourceScenes.filter(scene => scene.sourcePage === page.page);
        const first = source[0];
        const diagnostic = first?.payload.inputCompiler ?? compileSlide({ elements: [], title: `Página ${page.page}`, page: page.page, rawHash, structuralHash: compilerHash({ rawHash, page: page.page }) });
        const all = source.flatMap(scene => scene.payload.inputCompiler?.parsedInput.nodes ?? []);
        diagnostic.parsedInput.nodes = all.map((node, i) => ({ ...node, id: `s${page.page}:o${i}` }));
        diagnostic.parsedInput.sourceStrings = source.flatMap(scene => scene.payload.inputCompiler?.parsedInput.sourceStrings ?? []);
        diagnostic.strategy = "BLOCKED";
        return { sceneType: "FIGURE", title: first?.title ?? `Página ${page.page}`, sourcePage: page.page, payload: { inputCompiler: diagnostic, searchableText: diagnostic.parsedInput.sourceStrings, layoutVersion: 2 } } satisfies MonitorDocumentSceneDraft;
      });
    }
    for (const scene of extraction.scenes) {
      const diagnostic = scene.payload.inputCompiler!;
      const page = pages.find(page => page.page === scene.sourcePage);
      if (!page) throw new Error("Página original sem referência nativa.");
      extraction.assets.push(page.asset);
      diagnostic.nativeReference = { assetKey: page.asset.key, width: page.asset.width!, height: page.asset.height!, sha256: page.sha256, rendererVersion: page.rendererVersion, text: page.text };
      const boxText = diagnostic.parsedInput.nodes.flatMap(node => node.element.kind === "text" ? [node.element.text] : []);
      const lost = missingTokens(boxText, [page.text]);
      if (lost.length) {
        // The native page is a checksum-verified raster generated from the original
        // document. A difference between two text extractors affects indexing/search,
        // not the visual fidelity of the fallback shown on the monitor.
        const issue: CompilerIssue = { code: "NATIVE_TEXT_INDEX_GAP", severity: "warning", message: `${lost.length} tokens do índice estrutural não apareceram no extrator textual nativo; a composição visual original foi preservada integralmente.`, nodeIds: [] };
        diagnostic.preflight.issues.push(issue);
      }
      if (diagnostic.strategy === "BLOCKED") {
        diagnostic.strategy = "NATIVE_FALLBACK"; diagnostic.preflight.status = "PASS";
        diagnostic.normalizedContent.transformations.push({ action: "NATIVE_FALLBACK", reason: diagnostic.fallbackReason ?? "Preservar composição original.", nodeIds: diagnostic.parsedInput.nodes.map(node => node.id) });
      }
      diagnostic.preflight.visual = "NATIVE_VERIFIED";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversão nativa indisponível.";
    extraction.warnings.push(message);
    for (const scene of extraction.scenes) if (scene.payload.inputCompiler?.strategy === "BLOCKED") scene.payload.inputCompiler.preflight.issues.push({ code: "NATIVE_UNAVAILABLE", message, severity: "error", nodeIds: [] });
  }
  return extraction;
}

export function compilationMetrics(diagnostics: Array<CompilerDiagnostic | undefined>) {
  const compiled = diagnostics.filter((value): value is CompilerDiagnostic => Boolean(value));
  const checked = compiled.filter(value => value.humanReview);
  return { slides: compiled.length, fallback: compiled.filter(value => value.strategy === "NATIVE_FALLBACK").length, blocked: compiled.filter(value => value.preflight.status === "BLOCKED").length,
    llmCalls: compiled.reduce((sum, value) => sum + value.llm.calls, 0), cacheHits: compiled.filter(value => value.llm.cache === "HIT").length,
    confidenceMean: compiled.length ? compiled.reduce((sum, value) => sum + value.interpretedContent.confidence, 0) / compiled.length : null,
    verifiedWithoutManualCorrectionPercent: checked.length ? checked.filter(value => value.humanReview?.outcome === "CORRECT").length / checked.length * 100 : null,
    verifiedSampleSize: checked.length, archetypes: Object.fromEntries([...new Set(compiled.map(value => value.interpretedContent.archetype))].map(type => [type, compiled.filter(value => value.interpretedContent.archetype === type).length])),
    failures: Object.fromEntries([...new Set(compiled.flatMap(value => value.preflight.issues.filter(issue => issue.severity === "error").map(issue => issue.code)))].map(code => [code, compiled.filter(value => value.preflight.issues.some(issue => issue.code === code)).length])) };
}
