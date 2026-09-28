import type { MonitorSlideElement } from './types';

// Reflow only table slides. Mixed charts/images retain their spatial relationships.
export function monitorTableSlide(elements: MonitorSlideElement[]) {
  const tables = elements.filter((item) => item.kind === 'table');
  if (tables.length !== 1 || elements.some((item) => item.kind === 'chart' || item.kind === 'image')) return null;
  return { table: tables[0], texts: elements.filter((item) => item.kind === 'text').sort((a, b) => a.y - b.y || a.x - b.x) };
}

export function tableRowPages(heights: number[], capacity: number) {
  const pages: number[][] = [];
  let page: number[] = [];
  let used = 0;
  heights.forEach((height, index) => {
    if (page.length && used + height > capacity) { pages.push(page); page = []; used = 0; }
    page.push(index); used += height;
  });
  if (page.length || !pages.length) pages.push(page);
  return pages;
}
