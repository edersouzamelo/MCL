import catalog from "./om-crests.json";

export const OM_CREST_CATALOG = catalog;
export type OmCrest = (typeof catalog.units)[number];

export function normalizeOmName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/[ºª°]/g, "").replace(/[^A-Z0-9]/g, "");
}

const aliases = new Map<string, OmCrest>();
for (const unit of catalog.units) {
  for (const name of [unit.acronym, unit.name, ...unit.aliases]) {
    const key = normalizeOmName(name);
    const previous = aliases.get(key);
    if (previous && previous.id !== unit.id) throw new Error(`Sigla de OM ambígua: ${name}`);
    aliases.set(key, unit);
  }
}

/** No substring/fuzzy lookup: 9 BEC, 9 BE Cmb and CIAC have distinct emblems. */
export function findOmCrest(name: string): OmCrest | undefined {
  return aliases.get(normalizeOmName(name));
}

const accentLetters: Record<string, string> = { A: "[AÁÀÂÃÄ]", E: "[EÉÊÈË]", I: "[IÍÌÎÏ]", O: "[OÓÔÕÒÖ]", U: "[UÚÙÛÜ]", C: "[CÇ]" };
const mentionPattern = new RegExp(`(?<![\\p{L}\\d])(?:${[...aliases.keys()].filter((key) => key !== "GPTLOG")
  .sort((a, b) => b.length - a.length)
  .map((key) => [...key].map((letter) => accentLetters[letter] ?? letter).join("[\\sºª°./_-]*")).join("|")})(?![\\p{L}\\d])`, "giu");

/** Literal catalog mentions, longest first. Character offsets preserve the source text. */
export function omMentionParts(text: string): Array<{ text: string; om?: OmCrest }> {
  const parts: Array<{ text: string; om?: OmCrest }> = [];
  let cursor = 0;
  for (const match of text.matchAll(mentionPattern)) {
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ text: match[0], om: findOmCrest(match[0]) });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
