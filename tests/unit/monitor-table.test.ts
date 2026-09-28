import { describe, expect, it } from 'vitest';
import { monitorTableSlide, tableRowPages } from '@/modules/grupamento/monitor-content/table-layout';
import type { MonitorSlideElement } from '@/modules/grupamento/monitor-content/types';

describe('adaptive document tables', () => {
  it('preserves every row exactly once and does not split a row at a page boundary', () => {
    expect(tableRowPages([40, 80, 40, 50], 120)).toEqual([[0, 1], [2, 3]]);
    expect(tableRowPages([200, 20], 120)).toEqual([[0], [1]]);
    expect(tableRowPages([], 120)).toEqual([[]]);
  });
  it('reflows single tables while retaining titles, footnotes and totals', () => {
    const items: MonitorSlideElement[] = [
      { kind: 'text', text: 'Total: R$ 460.000,00', x: .1, y: .8, w: .8, h: .1, z: 3 },
      { kind: 'table', columns: ['PI', 'Nome do PI', 'Pago'], rows: [['E6RVPLJM', 'MEDIDAS PREVENTIVAS COMPLETAS', 'R$ 30.687,87']], x: .2, y: .4, w: .6, h: .2, z: 2 },
      { kind: 'text', text: 'Remonta e Veterinária', x: .1, y: .1, w: .8, h: .1, z: 1 },
    ];
    const result = monitorTableSlide(items)!;
    expect(result.table).toBe(items[1]);
    expect(result.texts.map(item => item.text)).toEqual(['Remonta e Veterinária', 'Total: R$ 460.000,00']);
    expect(monitorTableSlide([...items, { kind: 'image', assetId: 'a', x: .2, y: .2, w: .2, h: .2, z: 4 }])).toBeNull();
  });
});
