"use client";

import { OmMentions } from "@/components/OmIdentity";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { tableRowPages } from '@/modules/grupamento/monitor-content/table-layout';

export function MonitorDocumentTable({ columns, rows, cycleSeconds = 15, paused = false, onPageCount }: {
  columns: string[]; rows: string[][]; cycleSeconds?: number; paused?: boolean; onPageCount?: (count: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLTableElement>(null);
  const [fit, setFit] = useState({ font: 18, wrapNumbers: false, pages: [rows.map((_, i) => i)], ready: false });
  const [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const probe = probeRef.current;
    if (!frame || !probe) return;
    let disposed = false;
    const measure = () => {
      if (disposed || !frame.clientWidth || !frame.clientHeight) return;
      const capacity = frame.clientHeight - 30;
      // Use the actual rendered text dimensions, never the PowerPoint box height.
      let font = 28;
      probe.querySelectorAll<HTMLElement>('[data-numeric-cell]').forEach(cell => { cell.style.whiteSpace = 'nowrap'; });
      probe.style.fontSize = `${font}px`;
      while (font > 16 && (probe.scrollWidth > frame.clientWidth || probe.offsetHeight > capacity)) {
        font = Math.max(16, font - 1);
        probe.style.fontSize = `${font}px`;
      }
      const wrapNumbers = probe.scrollWidth > frame.clientWidth;
      if (wrapNumbers) probe.querySelectorAll<HTMLElement>('[data-numeric-cell]').forEach(cell => { cell.style.whiteSpace = 'normal'; });
      const head = probe.tHead?.offsetHeight ?? 0;
      const heights = Array.from(probe.tBodies[0]?.rows ?? []).map(row => row.getBoundingClientRect().height);
      const pages = tableRowPages(heights, Math.max(1, capacity - head));
      setFit({ font, wrapNumbers, pages, ready: true });
      setPage(current => Math.min(current, pages.length - 1));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    measure();
    void document.fonts.ready.then(measure);
    return () => { disposed = true; observer.disconnect(); };
  }, [columns, rows]);
  useEffect(() => { if (fit.ready) onPageCount?.(fit.pages.length); }, [fit.ready, fit.pages.length, onPageCount]);
  useEffect(() => {
    if (paused || fit.pages.length < 2) return;
    const timer = window.setInterval(() => setPage(current => (current + 1) % fit.pages.length), cycleSeconds * 1000);
    return () => clearInterval(timer);
  }, [paused, fit.pages.length, cycleSeconds]);
  useEffect(() => {
    const capturePage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "MCL_CAPTURE_TABLE_PAGE" || !Number.isInteger(event.data.page)) return;
      setPage(Math.max(0, Math.min(event.data.page, fit.pages.length - 1)));
    };
    window.addEventListener("message", capturePage);
    return () => window.removeEventListener("message", capturePage);
  }, [fit.pages.length]);
  const widths = columns.map((column, index) => {
    const values = [column, ...rows.map(row => row[index] ?? '')];
    return Math.max(9, Math.min(40, Math.max(...values.map(value => value.length + 2))));
  });
  const total = widths.reduce((sum, width) => sum + width, 0);
  const table = (indices: number[], measuring = false) => <table ref={measuring ? probeRef : undefined} aria-hidden={measuring || undefined}
    className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize: fit.font, lineHeight: 1.3 }}>
    <colgroup>{widths.map((width, i) => <col key={i} style={{ width: `${width / total * 100}%` }} />)}</colgroup>
    <thead className="bg-sky-400/10"><tr>{columns.map((column, i) => <th key={i} className="px-2 py-3 text-left align-top font-bold" style={{ overflowWrap: 'anywhere' }}>{column}</th>)}</tr></thead>
    <tbody>{indices.map(index => <tr key={index} className="border-b border-slate-400/20">{columns.map((_, i) => <td key={i} data-numeric-cell={/^(?:R\$\s*)?[+-]?[\d.,]+\s*%?$/.test(rows[index][i]?.trim() ?? '') || undefined} className="px-2 py-3 align-top" style={{ whiteSpace: !fit.wrapNumbers && /^(?:R\$\s*)?[+-]?[\d.,]+\s*%?$/.test(rows[index][i]?.trim() ?? '') ? 'nowrap' : 'normal', overflowWrap: 'anywhere' }}><OmMentions text={rows[index][i] ?? ''} /></td>)}</tr>)}</tbody>
  </table>;
  return <div ref={frameRef} className="relative min-h-0 flex-1" data-monitor-document-table data-capture-page-count={fit.pages.length} data-capture-page={page}>
    <div className="pointer-events-none invisible absolute left-0 top-0 w-full" aria-hidden="true">{table(rows.map((_, i) => i), true)}</div>
    <div style={{ visibility: fit.ready ? 'visible' : 'hidden' }}>{table(fit.pages[Math.min(page, fit.pages.length - 1)])}</div>
    {fit.pages.length > 1 && <div className="absolute bottom-0 right-0 text-sm opacity-75">Quadro {page + 1}/{fit.pages.length}</div>}
  </div>;
}
