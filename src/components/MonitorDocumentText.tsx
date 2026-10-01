"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { OmMentions } from "./OmIdentity";
import { tableRowPages } from "@/modules/grupamento/monitor-content/table-layout";
import { splitDocumentParagraph } from "@/modules/grupamento/monitor-content/text-document";
import { documentProseAllowsCrests } from "@/modules/grupamento/om-crests";

/** Size from the frame, measure natural paragraphs, then paginate at readable sizes. */
export function MonitorDocumentText({ paragraphs, source, sourcePage, light, cycleSeconds = 15, paused = false, onPageCount }: {
  paragraphs: string[]; source: string; sourcePage: number | null; light: boolean; cycleSeconds?: number; paused?: boolean; onPageCount?: (count: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null), probe = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ font: 24, limit: 420, capacity: 0 });
  const [fit, setFit] = useState({ pages: [[]] as number[][], heights: [] as number[], ready: false });
  const [page, setPage] = useState(0);
  // Decide on the complete paragraph, before narrow screens split a route or
  // sentence into fragments that can look like an isolated OM label.
  const fragments = paragraphs.flatMap(text => splitDocumentParagraph(text, geometry.limit).map(chunk => ({text:chunk,crests:documentProseAllowsCrests(text)})));
  const chunks = fragments.map(fragment => fragment.text);
  const contentKey = chunks.join("\u0000");
  useLayoutEffect(() => {
    const node = frame.current; if (!node) return;
    const measure = () => {
      const capacity = Math.max(1, node.clientHeight - 28), font = Math.max(18, Math.min(40, Math.floor(node.clientWidth / 38)));
      // Bound individual paragraphs before measuring so even a narrow frame
      // can paginate without cutting a paragraph through its last line.
      const chars = Math.max(10, Math.floor((node.clientWidth - 48) / (font * .65)));
      const lines = Math.max(1, Math.floor((capacity - 40) / (font * 1.35)));
      const limit = Math.max(30, Math.min(420, chars * lines));
      setGeometry(old => old.font === font && old.limit === limit && old.capacity === capacity ? old : { font, limit, capacity });
    };
    const observer = new ResizeObserver(measure); observer.observe(node); measure();
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [paragraphs]);
  useLayoutEffect(() => {
    if (!probe.current || !geometry.capacity) return;
    const nodes = Array.from(probe.current.children) as HTMLElement[];
    const heights = nodes.map(node => node.offsetHeight + 10);
    const overflow = nodes.some(node => node.scrollWidth > node.clientWidth + 1 || node.offsetHeight + 10 > geometry.capacity);
    if (overflow && geometry.limit > 30) { setGeometry(old => ({ ...old, limit: Math.max(30, Math.floor(old.limit * .75)) })); return; }
    const pages = tableRowPages(heights, geometry.capacity);
    setFit(old => old.ready && JSON.stringify(old.pages) === JSON.stringify(pages) && JSON.stringify(old.heights) === JSON.stringify(heights) ? old : { pages, heights, ready: true });
    setPage(current => Math.min(current, pages.length - 1));
  }, [geometry, contentKey]);
  useEffect(() => { if (fit.ready) onPageCount?.(fit.pages.length); }, [fit.ready, fit.pages.length, onPageCount]);
  useEffect(() => {
    if (paused || fit.pages.length < 2) return;
    const timer = window.setInterval(() => setPage(current => (current+1) % fit.pages.length), cycleSeconds*1000);
    return () => clearInterval(timer);
  }, [paused, fit.pages.length, cycleSeconds]);
  useEffect(() => {
    const capture = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === window.parent && event.data?.type === "MCL_CAPTURE_TEXT_PAGE" && Number.isInteger(event.data.page)) setPage(Math.max(0, Math.min(event.data.page, fit.pages.length-1)));
    };
    window.addEventListener("message", capture); return () => window.removeEventListener("message", capture);
  }, [fit.pages.length]);
  const indices = fit.pages[Math.min(page, fit.pages.length-1)] ?? [];
  const card = (text: string, index: number, measuring = false) => <article key={index} data-text-paragraph={measuring ? undefined : index}
    className={`rounded-xl border px-5 py-3 ${light ? "border-slate-300 bg-white/80 text-slate-900" : "border-sky-300/15 bg-sky-400/[.04] text-slate-100"}`}
    style={{ fontSize: geometry.font, lineHeight: 1.35, fontWeight: 600, whiteSpace: "pre-wrap", overflowWrap: "anywhere", flex: measuring ? undefined : `${fit.heights[index] ?? 1} 0 auto` }}>
    {fragments[index]?.crests ? <OmMentions text={text} prose /> : text}
  </article>;
  return <section ref={frame} className="relative h-full min-h-0 w-full" data-monitor-document-text data-text-ready={fit.ready ? "1" : "0"} data-capture-page-count={fit.pages.length} data-capture-page={page}>
    <div ref={probe} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 w-full space-y-2.5">{chunks.map((text,index) => card(text,index,true))}</div>
    <div data-text-display className="flex flex-col gap-2.5" style={{ height: geometry.capacity, visibility: fit.ready ? "visible" : "hidden" }}>{indices.map(index => card(chunks[index],index))}</div>
    <footer className="absolute bottom-0 flex w-full justify-between gap-3 text-[11px] opacity-65"><span className="truncate">{source}{sourcePage ? ` · página ${sourcePage}` : ""}</span>{fit.pages.length > 1 && <span className="shrink-0">Quadro {Math.min(page+1,fit.pages.length)}/{fit.pages.length}</span>}</footer>
  </section>;
}
