export type PieSliceGeometry = {
  index: number;
  value: number;
  fraction: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
};

export type PieLabelPosition = {
  index: number;
  x: number;
  y: number;
  anchor: "start" | "end";
  lineStartX: number;
  lineStartY: number;
  lineBendX: number;
  lineBendY: number;
};

export function pieSliceGeometry(values: number[]) {
  const normalized = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0));
  const total = normalized.reduce((sum, value) => sum + value, 0);
  let cursor = -Math.PI / 2;
  return normalized.map((value, index): PieSliceGeometry => {
    const fraction = total > 0 ? value / total : 0;
    const startAngle = cursor;
    const endAngle = cursor + fraction * Math.PI * 2;
    cursor = endAngle;
    return { index, value, fraction, startAngle, endAngle, midAngle: (startAngle + endAngle) / 2 };
  });
}

export function pieArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, innerRadius = 0) {
  const point = (r: number, angle: number) => ({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  const outerStart = point(radius, startAngle);
  const outerEnd = point(radius, endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  if (innerRadius <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${radius} ${radius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
      "Z",
    ].join(" ");
  }
  const innerEnd = point(innerRadius, endAngle);
  const innerStart = point(innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${radius} ${radius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function pieLabelPositions(
  slices: PieSliceGeometry[],
  width: number,
  height: number,
  radius: number,
  labelIndices: number[],
  fontSize: number,
) {
  const cx = width / 2;
  const cy = height / 2;
  const labelRadius = radius + Math.max(18, fontSize * 1.6);
  const minGap = Math.max(14, fontSize * 1.3);
  const top = fontSize;
  const bottom = Math.max(top, height - fontSize);
  const positions: PieLabelPosition[] = [];

  for (const side of [-1, 1] as const) {
    const items = labelIndices
      .map((index) => slices[index])
      .filter(Boolean)
      .filter((slice) => (Math.cos(slice.midAngle) >= 0 ? 1 : -1) === side)
      .map((slice) => ({
        slice,
        rawY: cy + Math.sin(slice.midAngle) * labelRadius,
      }))
      .sort((a, b) => a.rawY - b.rawY);

    let previous = top - minGap;
    for (const item of items) {
      const y = Math.min(bottom, Math.max(top, Math.max(item.rawY, previous + minGap)));
      previous = y;
      const lineStartX = cx + Math.cos(item.slice.midAngle) * radius;
      const lineStartY = cy + Math.sin(item.slice.midAngle) * radius;
      const lineBendX = cx + side * (radius + 10);
      const x = cx + side * Math.min(width * .45, radius + Math.max(30, fontSize * 3));
      positions.push({
        index: item.slice.index,
        x,
        y,
        anchor: side > 0 ? "start" : "end",
        lineStartX,
        lineStartY,
        lineBendX,
        lineBendY: y,
      });
    }
  }

  return positions.sort((a, b) => a.index - b.index);
}
