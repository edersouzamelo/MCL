export type ChartCategoryLabelLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
};

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitLongWord(word: string, limit: number) {
  if (word.length <= limit) return [word];
  const chunks: string[] = [];
  for (let start = 0; start < word.length; start += limit) chunks.push(word.slice(start, start + limit));
  return chunks;
}

export function wrapChartLabel(text: string, availablePx: number, fontPx: number) {
  const value = normalized(text);
  if (!value) return [""];
  const limit = Math.max(1, Math.floor(Math.max(1, availablePx) / Math.max(1, fontPx * 0.58)));
  const lines: string[] = [];
  for (const word of value.split(" ")) {
    const chunks = splitLongWord(word, limit);
    for (const chunk of chunks) {
      const current = lines[lines.length - 1];
      if (current && current.length + chunk.length + 1 <= limit) lines[lines.length - 1] = current + " " + chunk;
      else lines.push(chunk);
    }
  }
  return lines.length ? lines : [""];
}

function textWidth(text: string, fontPx: number) {
  return normalized(text).length * fontPx * 0.58;
}

export function fitHorizontalCategoryLabel(
  text: string,
  availablePx: number,
  rowHeightPx: number,
  preferredFontPx: number,
): ChartCategoryLabelLayout {
  const value = normalized(text);
  if (!value) return { lines: [""], fontSize: preferredFontPx, lineHeight: preferredFontPx * 1.08 };

  const preferred = Math.max(8, preferredFontPx);
  const minimum = Math.min(preferred, 7.5);
  const usableHeight = Math.max(8, rowHeightPx * 0.86);

  for (let fontSize = preferred; fontSize >= minimum; fontSize -= 0.5) {
    const lines = wrapChartLabel(value, Math.max(1, availablePx), fontSize);
    const lineHeight = fontSize * 1.08;
    if (lines.length * lineHeight <= usableHeight) return { lines, fontSize, lineHeight };
  }

  const widthFit = Math.max(6.5, Math.min(preferred, Math.max(1, availablePx) / Math.max(1, value.length * 0.58)));
  const heightFit = Math.max(6.5, Math.min(preferred, usableHeight / 1.08));
  const fontSize = Math.min(widthFit, heightFit);
  return { lines: [value], fontSize, lineHeight: fontSize * 1.08 };
}

export function estimatedChartLabelWidth(text: string, fontPx: number) {
  return textWidth(text, fontPx);
}


export type VerticalCategoryAxisLayout = {
  angle: number;
  fontSize: number;
  bottomExtent: number;
};

export function fitVerticalCategoryAxis(
  labels: string[],
  slotPx: number,
  availableHeightPx: number,
  preferredFontPx: number,
): VerticalCategoryAxisLayout {
  const clean = labels.map(normalized).filter(Boolean);
  const preferred = Math.max(9, preferredFontPx);
  if (!clean.length) return { angle: 0, fontSize: preferred, bottomExtent: preferred * 1.4 };

  const maxWidthAt = (fontSize: number) => Math.max(...clean.map((text) => textWidth(text, fontSize)));
  const directWidth = maxWidthAt(preferred);
  if (directWidth <= Math.max(12, slotPx * .9)) {
    return { angle: 0, fontSize: preferred, bottomExtent: preferred * 1.5 };
  }

  const maxBottom = Math.max(64, availableHeightPx * .4);
  for (const angle of [-45, -55, -65, -75, -82, -90]) {
    const radians = Math.abs(angle) * Math.PI / 180;
    for (let fontSize = preferred; fontSize >= 9; fontSize -= .5) {
      const width = maxWidthAt(fontSize);
      const projectedHorizontal = width * Math.cos(radians) + fontSize * Math.sin(radians);
      const projectedVertical = width * Math.sin(radians) + fontSize * Math.cos(radians);
      if (projectedHorizontal <= Math.max(14, slotPx * .94) && projectedVertical <= maxBottom) {
        return { angle, fontSize, bottomExtent: projectedVertical + fontSize * .9 };
      }
    }
  }

  const fallbackFont = Math.max(9, Math.min(preferred, maxBottom / Math.max(1, maxWidthAt(1))));
  return { angle: -90, fontSize: fallbackFont, bottomExtent: Math.min(maxBottom, maxWidthAt(fallbackFont)) + fallbackFont };
}
