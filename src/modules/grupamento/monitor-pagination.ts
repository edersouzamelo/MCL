export const MIN_MONITOR_SCALE = 0.86;

export type MonitorPage = { top: number; height: number };

/** Discrete pages at block boundaries, never a continuously moving viewport. */
export function paginateMonitor(height: number, capacity: number, blocks: MonitorPage[]): MonitorPage[] {
  if (capacity <= 0 || height <= 0) return [{ top: 0, height: 0 }];
  const pages: MonitorPage[] = [];
  let top = 0;
  while (top < height - 1) {
    let end = Math.min(height, top + capacity);
    // A cut must not bisect any row/card, including adjacent columns.
    for (let guard = 0; guard <= blocks.length; guard++) {
      const crossing = blocks.filter((b) => b.top < end - 1 && b.top + b.height > end + 1);
      if (!crossing.length) break;
      const before = Math.min(...crossing.map((b) => b.top));
      if (before <= top + 1) break;
      end = before;
    }
    pages.push({ top, height: end - top });
    top = end;
  }
  return pages.length ? pages : [{ top: 0, height }];
}
