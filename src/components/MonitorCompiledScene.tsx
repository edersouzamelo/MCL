/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MonitorTitleFrame } from "./MonitorTitleFrame";
import { MonitorDocumentText } from "./MonitorDocumentText";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";

/** A runtime measurement is separate from structural PASS. It can only switch
 * to a checksum-verified native reference, never hide the overflowing object. */
export function MonitorCompiledScene({ scene, light, cycleSeconds, paused, onPageCount, children }: {
  scene: MonitorDocumentSceneDto; light: boolean; cycleSeconds?: number; paused?: boolean; onPageCount?: (count: number) => void; children: ReactNode;
}) {
  const diagnostic = scene.payload.inputCompiler!;
  const root = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const node = root.current; if (!node) return;
    setOverflow(false);
    const measure = () => {
      const texts = [...node.querySelectorAll<HTMLElement>("[data-compiler-text]")];
      const issues = texts.filter(text => text.scrollHeight > text.clientHeight + 2 || text.scrollWidth > text.clientWidth + 2 || parseFloat(getComputedStyle(text).fontSize) < 12);
      if (issues.length) setOverflow(true);
      node.dataset.compilerVisual = issues.length ? "OVERFLOW" : "DOM_VERIFIED";
    };
    const observer = new ResizeObserver(measure); observer.observe(node);
    void document.fonts.ready.then(measure);
    const timer = setTimeout(measure, 600);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [scene.id, diagnostic.source.structuralHash]);
  const native = diagnostic.nativeReference?.assetId;
  const useNative = diagnostic.strategy === "NATIVE_FALLBACK" || diagnostic.strategy === "BLOCKED" || overflow;
  useEffect(() => { if (useNative) onPageCount?.(1); }, [useNative, onPageCount]);
  if (useNative && native) return <div className="flex h-full w-full items-center justify-center" data-compiler-strategy="NATIVE_FALLBACK" data-integral-image-slide>
    <img src={"/api/grupamento/monitor-content/assets/" + native} alt={scene.title} className="h-full w-full object-contain" />
  </div>;
  if (useNative) return <div className="flex h-full items-center justify-center p-8 text-center" data-compiler-blocked>
    <div><p className="text-xl font-bold">Este conteúdo aguarda validação de fidelidade.</p><p className="mt-3">O arquivo original permanece disponível no painel.</p></div>
  </div>;
  if (diagnostic.strategy === "DOCUMENT_REFLOW") return <div ref={root} className="h-full w-full" data-compiler-strategy="DOCUMENT_REFLOW">
    <MonitorTitleFrame title={diagnostic.normalizedContent.title} light={light}><MonitorDocumentText paragraphs={diagnostic.normalizedContent.paragraphs ?? []} source={scene.sourceFileName} sourcePage={scene.sourcePage} light={light} cycleSeconds={cycleSeconds} paused={paused} onPageCount={onPageCount} /></MonitorTitleFrame>
  </div>;
  return <div ref={root} className="h-full w-full" data-compiler-strategy={diagnostic.strategy}>
    <MonitorTitleFrame title={diagnostic.normalizedContent.title} light={light} omitTitle={diagnostic.strategy === "NATIVE_IMAGE"}>{children}</MonitorTitleFrame>
  </div>;
}
