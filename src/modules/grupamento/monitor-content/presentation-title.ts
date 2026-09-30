import type { MonitorSlideElement, MonitorSlideTextElement } from "./types";

const ACRONYMS = new Set("MCL CMO CCOL OM OMDS UG UGS UASG PI PIS MEM QDMP PEEX SISCOFIS PRDU IRDU PCA PNCP CATMAT DFD SAG RPN RP ARP SISFRON EB II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX".split(" "));

/** Sentence case, preserving institutional acronyms, Roman numerals and identifiers. */
export function normalizeMonitorTitle(value: string) {
  const clean = value.normalize("NFC").replace(/[–—]/g, ":").replace(/(?<=\p{L})-(?=\p{L})/gu, " ").replace(/\s+/g, " ").trim();
  let firstWord = true;
  return clean.replace(/[\p{L}\p{N}]+(?:[ºª])?/gu, (word) => {
    const upper = word.toLocaleUpperCase("pt-BR");
    const first = firstWord;
    firstWord = false;
    if (ACRONYMS.has(upper) || /\p{L}.*\d|\d.*\p{L}/u.test(word)) return upper;
    const lower = word.toLocaleLowerCase("pt-BR");
    return first ? lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1) : lower;
  });
}

export function monitorTitleColor(light: boolean) { return light ? "#000000" : "#FFFFFF"; }

export function monitorTitleElements(elements: MonitorSlideElement[], fallback: string) {
  const texts = elements.filter((item): item is MonitorSlideTextElement => item.kind === "text");
  const candidates = texts.filter(item => item.role === "title" && item.y < .3);
  const normalizedFallback = normalizeMonitorTitle(fallback);
  const matching = texts.find(item => normalizeMonitorTitle(item.text) === normalizedFallback)
    ?? texts.find(item => item.y < .3 && normalizedFallback.length >= 20 && normalizeMonitorTitle(item.text).startsWith(normalizedFallback));
  const primary = matching ?? candidates.sort((a, b) => (b.fontSizePt ?? 0) - (a.fontSizePt ?? 0) || a.y - b.y)[0];
  const titles = primary ? texts.filter(item => item === primary || (item.y < .3 && normalizeMonitorTitle(item.text) === normalizeMonitorTitle(primary.text))) : [];
  const content = elements.filter(item => !titles.includes(item as MonitorSlideTextElement));
  // Reflow within the body only. The title has its own non-shrinking layout row.
  const top = content.length ? Math.min(...content.map(item => item.y)) : 0;
  const bottom = Math.max(top + .01, ...content.map(item => item.y + item.h));
  return {
    title: primary?.text ?? fallback,
    elements: content.map(item => ({ ...item, y: .02 + .96 * (item.y - top) / (bottom - top), h: .96 * item.h / (bottom - top) })),
  };
}
