"use client";

import { OmMentions } from "@/components/OmIdentity";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { tableRowPages } from '@/modules/grupamento/monitor-content/table-layout';
import { isMonitorNumber, MAX_TABLE_FONT, MIN_TABLE_FONT, PREFERRED_TABLE_FONT, TABLE_CELL_PADDING, monitorColumnMeasures, monitorColumnWidths, monitorDistributedHeights } from '@/modules/grupamento/monitor-content/table-fit';

type Fit = { font: number; widths: number[]; mode: 'table' | 'records'; pages: number[][]; ready: boolean; headHeight: number; heights: number[]; recordColumns: number; fieldWidth: number; capacity: number };

/** Measure untransformed source content; never derive the next fit from a previous fit. */
export function MonitorDocumentTable({ columns, rows, cycleSeconds = 15, paused = false, onPageCount }: {
  columns: string[]; rows: string[][]; cycleSeconds?: number; paused?: boolean; onPageCount?: (count: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ font: MIN_TABLE_FONT, widths: [], mode: 'table', pages: [rows.map((_, i) => i)], ready: false, heights: [], recordColumns: 1, fieldWidth: 180, capacity: 0, headHeight: 0 });
  const [page, setPage] = useState(0);
  const [probeRevision, setProbeRevision] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const probe = probeRef.current;
    if (!frame || !probe) return;
    let disposed = false;
    let raf = 0;
    const measure = () => {
      if (disposed || !frame.clientWidth || !frame.clientHeight) return;
      const capacity = Math.max(1, frame.clientHeight - 26);
      const available = frame.clientWidth;
      const canvas = document.createElement('canvas').getContext('2d');
      if (!canvas) return;
      const family = getComputedStyle(frame).fontFamily;
      const columnMeasures = (font: number) => monitorColumnMeasures(columns, rows, (text, bold) => {
        canvas.font = `${bold ? 700 : 400} ${font}px ${family}`;
        return canvas.measureText(text).width;
      });
      // Numeric cells must fit their own column; table.scrollWidth alone misses
      // overflowing text painted over a neighbouring cell in fixed-layout tables.
      let font = MAX_TABLE_FONT;
      let measures = columnMeasures(font);
      let widths = monitorColumnWidths(measures.minimum, measures.preferred, available);
      while (!widths && font > MIN_TABLE_FONT) {
        measures = columnMeasures(--font);
        widths = monitorColumnWidths(measures.minimum, measures.preferred, available);
      }
      const mode = widths && font >= PREFERRED_TABLE_FONT ? 'table' : 'records';
      if (mode === 'records') font = Math.min(32, Math.max(PREFERRED_TABLE_FONT, Math.floor(available / 35)));
      const maxAmount = Math.max(1, ...rows.flat().filter(isMonitorNumber).map(value => {
        canvas.font = `600 ${font}px ${family}`;
        return canvas.measureText(value).width;
      }));
      const fieldWidth = Math.ceil(maxAmount + 28);
      const recordColumns = available >= Math.max(900, fieldWidth * 4 + 64) ? 2 : 1;
      const next: Fit = { font, widths: widths ?? [], mode, pages: [rows.map((_, i) => i)], ready: false, heights: [], recordColumns, fieldWidth, capacity, headHeight: 0 };
      // The probe and visible content always share the same geometry and styles.
      // Commit geometry, then measure that render in the next layout effect.
      setFit(old => old.capacity === next.capacity && old.font === next.font && old.mode === next.mode && old.recordColumns === next.recordColumns && old.fieldWidth === next.fieldWidth && JSON.stringify(old.widths) === JSON.stringify(next.widths) ? old : next);
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(frame);
    measure();
    void document.fonts.ready.then(schedule);
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(raf); };
  }, [columns, rows]);

  useEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const observer = new ResizeObserver(() => setProbeRevision(current => current + 1));
    observer.observe(probe);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const probe = probeRef.current;
    if (!frame || !probe || !fit.capacity) return;
    const capacity = Math.max(1, frame.clientHeight - 26);
    const head = probe.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const blocks = Array.from(probe.querySelectorAll<HTMLElement>('[data-table-row-group]'));
    const heights = blocks.map(block => block.getBoundingClientRect().height);
    const cellOverflow = fit.mode === 'table' && Array.from(probe.querySelectorAll<HTMLElement>('td, th')).some(cell => cell.scrollWidth > cell.clientWidth + 2);
    if (cellOverflow) {
      setFit(old => ({ ...old, mode: 'records', font: PREFERRED_TABLE_FONT, recordColumns: 1, heights: [], ready: false }));
      return;
    }
    // Reflow before paginating: use a readable size and reclaim unused width.
    if ((probe.offsetHeight > capacity && fit.font > PREFERRED_TABLE_FONT) || (heights.some(height => height > capacity - head) && fit.font > MIN_TABLE_FONT)) {
      const font = fit.font - 1;
      const fieldWidth = Math.max(80, Math.ceil((fit.fieldWidth - 28) * font / fit.font + 28));
      setFit(old => ({ ...old, font, fieldWidth, heights: [], ready: false }));
      return;
    }
    // A wide record keeps descriptions intact and puts metrics in a compact band.
    if (fit.mode === 'records' && fit.recordColumns === 2 && probe.offsetHeight > capacity && rows.length <= 6) {
      setFit(old => ({ ...old, recordColumns: 1, heights: [], ready: false }));
      return;
    }
    const groups = tableRowPages(heights, Math.max(1, capacity - head));
    const pages = groups.map(group => group.flatMap(index => fit.mode === 'table' ? [index] : Array.from({ length: fit.recordColumns }, (_, column) => index * fit.recordColumns + column).filter(index => index < rows.length)));
    // Spread rows through the available height without stretching glyphs or images.
    setFit(old => old.ready && JSON.stringify(old.pages) === JSON.stringify(pages) && JSON.stringify(old.heights) === JSON.stringify(heights) && old.headHeight === head ? old : { ...old, pages, heights, headHeight: head, ready: true });
    setPage(current => Math.min(current, pages.length - 1));
  }, [fit.font, fit.mode, fit.widths, fit.recordColumns, fit.fieldWidth, fit.capacity, probeRevision, columns, rows]);

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

  const content = (indices: number[], measuring = false) => {
    const compact = fit.font < PREFERRED_TABLE_FONT;
    const labelFont = Math.max(compact ? 14 : 16, fit.font * .72);
    const step = fit.mode === 'records' ? fit.recordColumns : 1;
    const natural = indices.filter((_, i) => i % step === 0).map(index => fit.heights[Math.floor(index / step)] ?? 0);
    const heights = monitorDistributedHeights(natural, fit.capacity - fit.headHeight - 2);
    return fit.mode === 'table' ? <table className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize: fit.font, lineHeight: 1.3 }}>
    <colgroup>{columns.map((_, i) => <col key={i} style={{ width: fit.widths[i] }} />)}</colgroup>
    <thead className="bg-sky-400/10"><tr>{columns.map((column, i) => <th key={i} className="py-3 text-left align-middle font-bold" style={{ paddingInline: TABLE_CELL_PADDING, overflowWrap: 'normal' }}>{column}</th>)}</tr></thead>
    <tbody>{indices.map((index, position) => <tr key={index} data-table-row-group data-source-row={index} className="border-b border-slate-400/20" style={{ height: measuring ? undefined : heights[position] }}>{columns.map((_, i) => <td key={i} data-source-column={i} data-numeric-cell={isMonitorNumber(rows[index]?.[i] ?? '') || undefined} className="py-3 align-middle" style={{ paddingInline: TABLE_CELL_PADDING, whiteSpace: isMonitorNumber(rows[index]?.[i] ?? '') ? 'nowrap' : 'normal', overflowWrap: 'normal', fontVariantNumeric: 'tabular-nums' }}><OmMentions text={rows[index]?.[i] ?? ''} /></td>)}</tr>)}</tbody>
  </table> : <div style={{ fontSize: fit.font, lineHeight: compact ? 1.2 : 1.3 }}>
    {!rows.length && <div className="flex flex-wrap gap-4 font-bold">{columns.map((column, index) => <span key={index}>{column}</span>)}</div>}
    {Array.from({ length: Math.ceil(indices.length / fit.recordColumns) }, (_, group) => <div key={group} data-table-row-group className="grid gap-3 pb-3" style={{ gridTemplateColumns: `repeat(${fit.recordColumns}, minmax(0, 1fr))`, minHeight: measuring ? undefined : heights[group] }}>
      {indices.slice(group * fit.recordColumns, (group + 1) * fit.recordColumns).map(index => <article key={index} data-source-row={index} className="flex min-w-0 flex-col justify-center rounded-xl border border-slate-400/25 bg-sky-400/[.035]" style={{ padding: compact ? 6 : 12 }}>
        <dl className="grid gap-x-4 gap-y-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', rowGap: compact ? 4 : 12 }}>
          {columns.map((column, i) => !isMonitorNumber(rows[index]?.[i] ?? '') && <div key={i} className="min-w-0">
            <dt className="font-bold opacity-75" style={{ fontSize: labelFont, overflowWrap: 'anywhere' }}>{column}</dt>
            <dd className="mt-1 font-semibold" data-source-column={i} style={{ marginInline: 0, overflowWrap: 'anywhere' }}><OmMentions text={rows[index]?.[i] ?? ''} /></dd>
          </div>)}
        </dl>
        <dl className="flex flex-wrap gap-x-4" style={{ marginTop: compact ? 8 : 12, rowGap: compact ? 4 : 12 }}>
          {columns.map((column, i) => isMonitorNumber(rows[index]?.[i] ?? '') && <div key={i} style={{ flex: '1 1 110px', minWidth: 'min-content' }}>
            <dt className="font-bold opacity-75" style={{ fontSize: labelFont }}>{column}</dt>
            <dd className="mt-1 font-semibold" data-source-column={i} data-numeric-cell style={{ marginInline: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}><OmMentions text={rows[index]?.[i] ?? ''} /></dd>
          </div>)}
        </dl>
      </article>)}
    </div>)}
  </div>;
  };
  return <div ref={frameRef} className="relative h-full min-h-0 flex-1" data-monitor-document-table data-table-mode={fit.mode} data-table-font={fit.font} data-table-ready={fit.ready ? "1" : "0"} data-capture-page-count={fit.pages.length} data-capture-page={page}>
    <div ref={probeRef} className="pointer-events-none invisible absolute left-0 top-0 w-full" aria-hidden="true">{content(rows.map((_, i) => i), true)}</div>
    <div data-table-display style={{ visibility: fit.ready ? 'visible' : 'hidden' }}>{content(fit.pages[Math.min(page, fit.pages.length - 1)])}</div>
    {fit.pages.length > 1 && <div className="absolute bottom-0 right-0 text-sm opacity-75">Quadro {page + 1}/{fit.pages.length}</div>}
  </div>;
}
