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

import { isMonitorNumber, monitorColumnMeasures, monitorColumnWidths, monitorDistributedHeights } from '@/modules/grupamento/monitor-content/table-fit';

describe('lossless width distribution', () => {
  it('distributes spare height without squeezing a taller row or overflowing a short page', () => {
    expect(monitorDistributedHeights([234, 130], 394)).toEqual([249, 145]);
    expect(monitorDistributedHeights([234], 394)).toEqual([394]);
    expect(monitorDistributedHeights([234, 130], 300)).toEqual([234, 130]);
  });
  it('reserves the complete width of money and codes and wraps headers at words', () => {
    const source = [['E6RVPLJMTOC', 'MEDIDAS PROFILÁTICAS SAÚDE CANINOS', 'R$ 30.687,87', '98.68%']];
    const before = JSON.stringify(source);
    const measured = monitorColumnMeasures(['Plano Interno', 'Descrição', 'Pago', 'Percentual empenhado'], source, text => text.length * 10);
    expect(measured.minimum).toEqual([132, 142, 142, 122]);
    expect(monitorColumnWidths(measured.minimum, measured.preferred, 450)).toBeNull();
    const widths = monitorColumnWidths(measured.minimum, measured.preferred, 1000)!;
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(1000);
    widths.forEach((width, i) => expect(width).toBeGreaterThanOrEqual(measured.minimum[i]));
    expect(JSON.stringify(source)).toBe(before);
  });
  it('recognizes monetary formats without parsing or reformatting any values', () => {
    ['R$ 1.234.567,89', '-10,35', '98.68%', '0,00'].forEach(value => expect(isMonitorNumber(value)).toBe(true));
    ['E6RVPLJMTOC', 'OUTROS - planejado', '9º B Sup', ''].forEach(value => expect(isMonitorNumber(value)).toBe(false));
  });
});
