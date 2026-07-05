/* eslint-disable no-console */
import pg from "pg";

const BASE_URL = process.env.COMPRAS_GOV_BASE_URL ?? "https://dadosabertos.compras.gov.br";
const ENDPOINT = "/modulo-material/4_consultarItemMaterial";
const PAGE_SIZE_HINT = 500;

type CatmatItem = {
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

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function searchText(item: CatmatItem) {
  return normalize([
    item.descricaoItem,
    item.nomePdm,
    item.nomeClasse,
    item.nomeGrupo,
    item.codigoItem,
  ].filter(Boolean).join(" "));
}

async function ensureTable(client: pg.Client) {
  await client.query(`
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
  await client.query(`CREATE INDEX IF NOT EXISTS catmat_items_search_text_idx ON catmat_items USING gin (to_tsvector('simple', search_text))`);
  await client.query(`CREATE INDEX IF NOT EXISTS catmat_items_codigo_classe_idx ON catmat_items (codigo_classe)`);
}

async function upsertOne(client: pg.Client, item: CatmatItem) {
  await client.query(
    `INSERT INTO catmat_items (
      codigo_item, codigo_grupo, nome_grupo, codigo_classe, nome_classe, codigo_pdm, nome_pdm,
      descricao_item, status_item, item_sustentavel, source_updated_at, fetched_at, search_text, payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),$12,$13::jsonb)
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
    [
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
      searchText(item),
      JSON.stringify(item),
    ],
  );
}

async function fetchPage(page: number) {
  const url = new URL(ENDPOINT, `${BASE_URL.replace(/\/$/, "")}/`);
  url.searchParams.set("pagina", String(page));
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} ao buscar ${url.toString()}`);
  const json = await response.json() as { resultado?: CatmatItem[]; totalPaginas?: number; paginasRestantes?: number; totalRegistros?: number };
  return {
    url: url.toString(),
    resultado: Array.isArray(json.resultado) ? json.resultado : [],
    totalPaginas: Number(json.totalPaginas ?? 0),
    paginasRestantes: Number(json.paginasRestantes ?? 0),
    totalRegistros: Number(json.totalRegistros ?? 0),
  };
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL nao configurada.");

  const from = Number(process.env.CATMAT_FROM_PAGE ?? process.argv[2] ?? 1);
  const maxPages = Number(process.env.CATMAT_PAGES ?? process.argv[3] ?? 9999);
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase") || dbUrl.includes("pooler") ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  await ensureTable(client);

  let imported = 0;
  let lastPage = from;
  try {
    for (let page = from; page < from + maxPages; page += 1) {
      const data = await fetchPage(page);
      lastPage = page;
      for (const item of data.resultado) {
        if (item?.codigoItem && item?.descricaoItem) {
          await upsertOne(client, item);
          imported += 1;
        }
      }
      console.log(`[CATMAT] pagina=${page} recebidos=${data.resultado.length} importados=${imported} totalRegistros=${data.totalRegistros} restantes=${data.paginasRestantes}`);
      if (!data.paginasRestantes || page >= data.totalPaginas) break;
    }
  } finally {
    const count = await client.query(`SELECT COUNT(*)::text AS count FROM catmat_items`);
    console.log(`[CATMAT] concluido. lastPage=${lastPage} importedRun=${imported} indexSize=${count.rows[0]?.count} pageSizeHint=${PAGE_SIZE_HINT}`);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
