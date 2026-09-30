/** Shared presentation policy. Measurements are pixels from the actual browser font. */
export const MIN_TABLE_FONT = 18;
export const PREFERRED_TABLE_FONT = 22;
export const MAX_TABLE_FONT = 40;
export const TABLE_CELL_PADDING = 10;

export function isMonitorNumber(value: string) {
  return /^(?:R\$\s*)?[+-]?[\d.,]+\s*%?$/.test(value.trim());
}

export function monitorColumnWidths(minimum: number[], preferred: number[], available: number): number[] | null {
  const required = minimum.reduce((sum, width) => sum + width, 0);
  if (required > available) return null;
  const room = available - required;
  const demands = minimum.map((width, i) => Math.max(0, preferred[i] - width));
  const demand = demands.reduce((sum, width) => sum + width, 0);
  return minimum.map((width, i) => width + (demand > room ? room * demands[i] / demand : demands[i] + (room - demand) / minimum.length));
}

export function monitorColumnMeasures(columns: string[], rows: string[][], measure: (text: string, bold: boolean) => number) {
  const minimum: number[] = [];
  const preferred: number[] = [];
  columns.forEach((label, index) => {
    const words = label.split(/\s+/).filter(Boolean);
    let min = Math.max(1, ...words.map(word => measure(word, true)));
    let ideal = measure(label, true);
    for (const row of rows) {
      const value = row[index] ?? '';
      const numeric = isMonitorNumber(value);
      const parts = numeric ? [value] : value.split(/\s+/).filter(Boolean);
      min = Math.max(min, ...parts.map(word => measure(word, false)));
      ideal = Math.max(ideal, measure(value, false));
    }
    // Descriptions can wrap at words. Amounts and codes keep their complete width.
    minimum.push(Math.ceil(min + TABLE_CELL_PADDING * 2 + 2));
    preferred.push(Math.ceil(Math.min(Math.max(min, ideal), Math.max(min, 340)) + TABLE_CELL_PADDING * 2 + 2));
  });
  return { minimum, preferred };
}

/** Equal surplus, never an equal height that would shrink a naturally taller row. */
export function monitorDistributedHeights(heights: number[], capacity: number) {
  const used = heights.reduce((sum, height) => sum + height, 0);
  const extra = Math.max(0, capacity - used) / Math.max(1, heights.length);
  return heights.map(height => Math.floor(height + extra));
}
