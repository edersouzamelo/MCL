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
