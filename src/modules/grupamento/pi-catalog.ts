export type PiIdentity = { pi?: string; piName?: string };
export type PiCatalog = Record<string, string>;

export function piCatalogKey(pi?: string) {
  return (pi ?? "").trim().toUpperCase();
}

/** Learn exact codes only. Conflicting descriptions within one load are not learned. */
export function collectPiDescriptions(rows: PiIdentity[]): PiCatalog {
  const names = new Map<string, Set<string>>();
  for (const row of rows) {
    const code = piCatalogKey(row.pi);
    const name = row.piName?.trim();
    if (!code || !name) continue;
    const values = names.get(code) ?? new Set<string>();
    values.add(name);
    names.set(code, values);
  }
  return Object.fromEntries([...names].filter(([, values]) => values.size === 1)
    .map(([code, values]) => [code, [...values][0]]));
}

/** Source descriptions take precedence; enrichment never changes financial values. */
export function withPiDescriptions<T extends PiIdentity>(rows: T[], catalog: PiCatalog): T[] {
  return rows.map((row) => row.piName?.trim() || !catalog[piCatalogKey(row.pi)]
    ? row : { ...row, piName: catalog[piCatalogKey(row.pi)] });
}
