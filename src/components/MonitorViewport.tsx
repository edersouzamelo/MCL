"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MIN_MONITOR_SCALE, paginateMonitor, type MonitorPage } from "@/modules/grupamento/monitor-pagination";

export function MonitorViewport({ children, documentMode, cycleSeconds, paused, onPageCount }: {
  children: ReactNode;
  documentMode: boolean;
  cycleSeconds: number;
  paused: boolean;
  onPageCount: (count: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; pages: MonitorPage[]; ready: boolean }>({ scale: 1, pages: [{ top: 0, height: 0 }], ready: false });
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;
    let raf = 0;
    let disposed = false;
    let measuredFrame = "";
    const measure = () => {
      if (disposed) return;
      const frameSize = `${frame.clientWidth}:${frame.clientHeight}`;
      if (frameSize === measuredFrame) return;
      // offsetHeight is the layout box. scrollHeight can include visual overflow
      // from animated descendants and must not drive the scene's scale.
      const height = content.offsetHeight;
      const capacity = frame.clientHeight - 24;
      if (!height || capacity <= 0) return;
      measuredFrame = frameSize;
      if (documentMode) {
        setFit({ scale: 1, pages: [{ top: 0, height: frame.clientHeight }], ready: true });
        return;
      }
      const scale = Math.max(MIN_MONITOR_SCALE, Math.min(1, capacity / height));
      const pageHeight = capacity / scale;
      const candidates = Array.from(content.querySelectorAll<HTMLElement>(".mcl-broadcast-card, .mcl-broadcast-row, .mcl-data-tile, tr, h1, p, [data-monitor-block]"));
      const blocks = candidates.filter((el) => el.offsetHeight <= pageHeight).map((el) => {
        let top = 0;
        let node: HTMLElement | null = el;
        while (node && node !== content) {
          top += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return { top, height: el.offsetHeight };
      });
      const pages = paginateMonitor(height, pageHeight, blocks);
      setFit((old) => Math.abs(old.scale - scale) < .001 && JSON.stringify(old.pages) === JSON.stringify(pages) && old.ready ? old : { scale, pages, ready: true });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(frame);
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(raf); };
  }, [documentMode]);

  useEffect(() => { onPageCount(fit.pages.length); }, [fit.pages.length, onPageCount]);
  useEffect(() => {
    if (paused || fit.pages.length < 2) return;
    const timer = window.setInterval(() => setPage((current) => (current + 1) % fit.pages.length), cycleSeconds * 1000);
    return () => clearInterval(timer);
  }, [paused, fit.pages.length, cycleSeconds]);

  const current = fit.pages[Math.min(page, fit.pages.length - 1)];
  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden" data-monitor-viewport data-page-count={fit.pages.length} data-scale={fit.scale}>
      <div className="w-full overflow-hidden" style={{ height: documentMode ? "100%" : current.height * fit.scale, visibility: fit.ready ? "visible" : "hidden" }}>
        <div ref={contentRef} className={documentMode ? "relative h-full w-full" : "relative flow-root w-full"} style={{
          height: documentMode ? "100%" : undefined,
          transform: `scale(${fit.scale}) translateY(-${current.top}px)`, transformOrigin: "top center",
        }}>{children}</div>
      </div>
      {fit.pages.length > 1 && <div className="absolute bottom-0 left-0 text-xs font-semibold opacity-65" aria-live="off">Quadro {Math.min(page + 1, fit.pages.length)}/{fit.pages.length}</div>}
    </div>
  );
}
