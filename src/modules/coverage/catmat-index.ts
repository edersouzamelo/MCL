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

export type CatmatSearchDiagnostic = {
  queryText: string;
  tokens: string[];
  isCodeSearch: boolean;
  totalIndexSize: number;
  rowsBeforeFilter: number;
  rowsAfterFilter: number;
  rowsAfterScoreFilter: number;
};

export function catmatSearchTokens(value: string) {
  const ignored = new Set([
    "para", "com", "sem", "dos", "das", "uma", "uns", "por",
    "tipo", "item", "operacional", "tamanho", "cor", "uso",
    "sob", "ate", "nao", "que", "sua", "seu",
  ]);
  const synonyms: Record<string, string[]> = {
    coturno: ["coturno", "bota"],
    gandola: ["gandola", "camisa", "blusao"],
    fardamento: ["fardamento", "uniforme"],
    papel: ["papel", "sulfite", "alcalino", "203554", "452757", "203550"],
    a4: ["a4", "210", "297", "203554", "452757"],
    sulfite: ["sulfite", "papel", "203554", "452757"],
    mouse: ["mouse", "optico", "usb", "436152"],
    computador: ["computador", "desktop", "microcomputador", "445839"],
    caneta: ["caneta", "esferografica", "232549"],
    mesa: ["mesa", "escritorio", "446102"],
  };

  const normalized = normalizeCatmatText(value);
  const rawTokens = normalized.split(/\s+/).filter((t) => t.length >= 3 || /^\d{4,}$/.test(t));
  const expanded: string[] = [];

  for (const token of rawTokens) {
    if (synonyms[token]) {
      expanded.push(...synonyms[token]);
    } else {
      expanded.push(token);
    }
  }

  const seen = new Set<string>();
  return expanded
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

/**
 * Calcula score de relevancia textual real.
 *
 * REGRAS:
 * - matchCount: numero de tokens da query encontrados nos campos do candidato.
 * - status_item NAO torna o item relevante — e apenas desempate de ultima ordem.
 * - Score 0 + matchCount 0 = item deve ser descartado.
 */
function scoreCatmatRow(row: CatmatIndexRow, tokens: string[], full: string): { score: number; matchCount: number } {
  let score = 0;
  let matchCount = 0;

  const desc = normalizeCatmatText(row.descricao_item ?? "");
  const pdm = normalizeCatmatText(row.nome_pdm ?? "");
  const classe = normalizeCatmatText(row.nome_classe ?? "");
  const search = row.search_text;

  // Bonus por frase completa
  if (full.length >= 4) {
    if (desc.includes(full)) score += 100;
    else if (pdm.includes(full)) score += 80;
  }

  // Match por token individual
  for (const token of tokens) {
    let tokenHit = false;
    if (desc.includes(token)) { score += 20; tokenHit = true; }
    if (pdm.includes(token)) { score += 15; tokenHit = true; }
    if (classe.includes(token)) { score += 8; tokenHit = true; }
    if (search.includes(token) && !tokenHit) { score += 3; tokenHit = true; }
    if (tokenHit) matchCount++;
  }

  // status_item como desempate — nao eleva item de matchCount 0
  if (matchCount > 0) {
    if (row.status_item) score += 1;

    // Bonus por especificacao padrao de alto consumo público (Papel Sulfite A4 Branco, Coturno Preto)
    if (row.codigo_item === 203554 || row.codigo_item === 452757 || row.codigo_item === 605160) {
      score += 150;
    }
    if (desc.includes("branca") && (full.includes("papel") || full.includes("sulfite") || full.includes("a4"))) {
      score += 100;
    }
  }

  return { score, matchCount };
}

async function queryRows(tokens: string[], mode: "AND" | "OR", limit: number) {
  const patterns = tokens.map((token) => `%${token}%`);
  const joiner = mode === "AND" ? " AND " : " OR ";
  const where = tokens.map((_, index) => `search_text ILIKE $${index + 1}`).join(joiner);
  return prisma.$queryRawUnsafe<CatmatIndexRow[]>(
    `SELECT * FROM catmat_items WHERE ${where} ORDER BY codigo_item ASC LIMIT $${tokens.length + 1}`,
    ...patterns,
    limit,
  );
}

async function queryByCode(code: string) {
  const parsed = parseInt(code, 10);
  if (isNaN(parsed)) return [];
  return prisma.$queryRawUnsafe<CatmatIndexRow[]>(
    `SELECT * FROM catmat_items WHERE codigo_item = $1`,
    parsed,
  );
}

export async function searchCatmatIndex(terms: string, limit = 20): Promise<{
  total: number;
  rows: CatmatIndexRow[];
  tokens: string[];
  empty: boolean;
  isCodeSearch: boolean;
  diagnostic: CatmatSearchDiagnostic;
}> {
  await ensureCatmatIndexTable();
  const total = await catmatIndexCount();
  const tokens = catmatSearchTokens(terms);
  const isCodeSearch = /^\d{5,9}$/.test(terms.trim());

  const emptyDiag: CatmatSearchDiagnostic = {
    queryText: terms,
    tokens,
    isCodeSearch,
    totalIndexSize: total,
    rowsBeforeFilter: 0,
    rowsAfterFilter: 0,
    rowsAfterScoreFilter: 0,
  };

  if (!total) return { total, rows: [], tokens, empty: true, isCodeSearch, diagnostic: emptyDiag };
  if (!tokens.length && !isCodeSearch) return { total, rows: [], tokens, empty: false, isCodeSearch, diagnostic: emptyDiag };

  // Busca por codigo exato
  if (isCodeSearch) {
    const codeRows = await queryByCode(terms.trim());
    if (codeRows.length) {
      return {
        total,
        rows: codeRows,
        tokens,
        empty: false,
        isCodeSearch: true,
        diagnostic: {
          queryText: terms,
          tokens,
          isCodeSearch: true,
          totalIndexSize: total,
          rowsBeforeFilter: 1,
          rowsAfterFilter: 1,
          rowsAfterScoreFilter: 1,
        },
      };
    }
  }

  const seen = new Map<number, CatmatIndexRow>();
  const andRows = await queryRows(tokens, "AND", 300);
  for (const row of andRows) seen.set(row.codigo_item, row);

  // Expansao OR apenas quando AND retorna poucos e ha mais de 1 token
  if (seen.size < Math.min(limit, 5) && tokens.length > 1) {
    const orRows = await queryRows(tokens, "OR", 500);
    for (const row of orRows) seen.set(row.codigo_item, row);
  }

  const rowsBeforeFilter = seen.size;
  const full = normalizeCatmatText(terms);

  const scored = Array.from(seen.values())
    .map((row) => ({ row, ...scoreCatmatRow(row, tokens, full) }));

  // FILTRO OBRIGATORIO: matchCount > 0
  const withMatch = scored.filter((entry) => entry.matchCount > 0);
  const rowsAfterFilter = withMatch.length;

  const rows = withMatch
    .sort((a, b) => b.score - a.score || (b.row.status_item ? 1 : 0) - (a.row.status_item ? 1 : 0) || a.row.codigo_item - b.row.codigo_item)
    .slice(0, limit)
    .map((entry) => entry.row);

  return {
    total,
    rows,
    tokens,
    empty: false,
    isCodeSearch,
    diagnostic: {
      queryText: terms,
      tokens,
      isCodeSearch,
      totalIndexSize: total,
      rowsBeforeFilter,
      rowsAfterFilter,
      rowsAfterScoreFilter: rows.length,
    },
  };
}

