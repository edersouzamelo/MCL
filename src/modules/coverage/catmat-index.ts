/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/server/db";

export type CatmatIndexRow = {
  codigo_item: number;
  codigo_grupo: string | null;
  nome_grupo: string | null;
  codigo_classe: string | null;
  nome_classe: string | null;
  codigo_pdm: string | null;
  nome_pdm: string | null;
  descricao_item: string;
  status_item: boolean | null;
  item_sustentavel: boolean | null;
  source_updated_at: Date | string | null;
  fetched_at: Date | string;
  search_text: string;
  payload: any;
};

export type CatmatSourceItem = {
  codigoItem: number;
  codigoGrupo?: string | number | null;
  nomeGrupo?: string | null;
  codigoClasse?: string | number | null;
  nomeClasse?: string | null;
  codigoPdm?: string | number | null;
  nomePdm?: string | null;
  descricaoItem: string;
  statusItem?: boolean | null;
  itemSustentavel?: boolean | null;
  dataHoraAtualizacao?: string | null;
};

export function normalizeCatmatText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function catmatSearchTokens(value: string) {
  const ignored = new Set(["para", "com", "sem", "dos", "das", "uma", "uns", "por", "tipo", "item", "operacional", "tamanho"]);
  const seen = new Set<string>();
  return normalizeCatmatText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 || /^\d+$/.test(token))
    .filter((token) => !ignored.has(token))
    .filter((token) => {
      if (seen.has(token)) return false;
      seen.add(token);
      return true;
    })
    .slice(0, 8);
}

export function buildCatmatSearchText(item: CatmatSourceItem) {
  return normalizeCatmatText([
    item.descricaoItem,
    item.nomePdm,
    item.nomeClasse,
    item.nomeGrupo,
    item.codigoItem,
  ].filter(Boolean).join(" "));
}

export async function ensureCatmatIndexTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catmat_items (
      codigo_item INTEGER PRIMARY KEY,
      codigo_grupo TEXT,
      nome_grupo TEXT,
      codigo_classe TEXT,
      nome_classe TEXT,
      codigo_pdm TEXT,
      nome_pdm TEXT,
      descricao_item TEXT NOT NULL,
      status_item BOOLEAN,
      item_sustentavel BOOLEAN,
      source_updated_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      search_text TEXT NOT NULL,
      payload JSONB NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS catmat_items_search_text_idx ON catmat_items USING gin (to_tsvector('simple', search_text))`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS catmat_items_nome_pdm_idx ON catmat_items (nome_pdm)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS catmat_items_codigo_classe_idx ON catmat_items (codigo_classe)`);
}

export async function catmatIndexCount() {
  await ensureCatmatIndexTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ count: string | number }>>(`SELECT COUNT(*)::text AS count FROM catmat_items`);
  return Number(rows[0]?.count ?? 0);
}

export async function upsertCatmatIndexItems(items: CatmatSourceItem[]) {
  await ensureCatmatIndexTable();
  const fetchedAt = new Date();
  for (const item of items) {
    if (!item.codigoItem || !item.descricaoItem) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO catmat_items (
        codigo_item, codigo_grupo, nome_grupo, codigo_classe, nome_classe, codigo_pdm, nome_pdm,
        descricao_item, status_item, item_sustentavel, source_updated_at, fetched_at, search_text, payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
      ON CONFLICT (codigo_item) DO UPDATE SET
        codigo_grupo = EXCLUDED.codigo_grupo,
        nome_grupo = EXCLUDED.nome_grupo,
        codigo_classe = EXCLUDED.codigo_classe,
        nome_classe = EXCLUDED.nome_classe,
        codigo_pdm = EXCLUDED.codigo_pdm,
        nome_pdm = EXCLUDED.nome_pdm,
        descricao_item = EXCLUDED.descricao_item,
        status_item = EXCLUDED.status_item,
        item_sustentavel = EXCLUDED.item_sustentavel,
        source_updated_at = EXCLUDED.source_updated_at,
        fetched_at = EXCLUDED.fetched_at,
        search_text = EXCLUDED.search_text,
        payload = EXCLUDED.payload`,
      item.codigoItem,
      item.codigoGrupo == null ? null : String(item.codigoGrupo),
      item.nomeGrupo ?? null,
      item.codigoClasse == null ? null : String(item.codigoClasse),
      item.nomeClasse ?? null,
      item.codigoPdm == null ? null : String(item.codigoPdm),
      item.nomePdm ?? null,
      item.descricaoItem,
      item.statusItem ?? null,
      item.itemSustentavel ?? null,
      item.dataHoraAtualizacao ? new Date(item.dataHoraAtualizacao) : null,
      fetchedAt,
      buildCatmatSearchText(item),
      JSON.stringify(item),
    );
  }
}

function scoreCatmatRow(row: CatmatIndexRow, tokens: string[], full: string) {
  let score = 0;
  const search = row.search_text;
  const desc = normalizeCatmatText(row.descricao_item ?? "");
  const pdm = normalizeCatmatText(row.nome_pdm ?? "");
  const classe = normalizeCatmatText(row.nome_classe ?? "");
  if (desc.includes(full)) score += 80;
  if (pdm.includes(full)) score += 60;
  for (const token of tokens) {
    if (pdm.includes(token)) score += 16;
    if (classe.includes(token)) score += 8;
    if (desc.includes(token)) score += 5;
    if (search.includes(token)) score += 2;
  }
  if (row.status_item) score += 3;
  return score;
}

async function queryRows(tokens: string[], mode: "AND" | "OR", limit: number) {
  const patterns = tokens.map((token) => `%${token}%`);
  const joiner = mode === "AND" ? " AND " : " OR ";
  const where = tokens.map((_, index) => `search_text LIKE $${index + 1}`).join(joiner);
  return prisma.$queryRawUnsafe<CatmatIndexRow[]>(
    `SELECT * FROM catmat_items WHERE ${where} ORDER BY codigo_item ASC LIMIT $${tokens.length + 1}`,
    ...patterns,
    limit,
  );
}

export async function searchCatmatIndex(terms: string, limit = 20) {
  await ensureCatmatIndexTable();
  const total = await catmatIndexCount();
  if (!total) return { total, rows: [], tokens: catmatSearchTokens(terms), empty: true };

  const tokens = catmatSearchTokens(terms);
  if (!tokens.length) return { total, rows: [], tokens, empty: false };

  const seen = new Map<number, CatmatIndexRow>();
  const andRows = await queryRows(tokens, "AND", 250);
  for (const row of andRows) seen.set(row.codigo_item, row);
  if (seen.size < limit && tokens.length > 1) {
    const orRows = await queryRows(tokens, "OR", 500);
    for (const row of orRows) seen.set(row.codigo_item, row);
  }

  const full = normalizeCatmatText(terms);
  const rows = Array.from(seen.values())
    .map((row) => ({ row, score: scoreCatmatRow(row, tokens, full) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.codigo_item - b.row.codigo_item)
    .slice(0, limit)
    .map((entry) => entry.row);

  return { total, rows, tokens, empty: false };
}
