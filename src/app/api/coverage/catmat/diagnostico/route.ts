import { NextResponse } from "next/server";
import { getRouteActor } from "@/modules/auth/route-actor";
import { getComprasGovConfig } from "@/modules/connectors/compras-gov/config";
import { COMPRAS_GOV_CATMAT_ENDPOINT } from "@/modules/connectors/compras-gov/constants";
import { comprasGovApiResponseSchema, comprasGovCatalogItemSchema } from "@/modules/connectors/compras-gov/schemas";
import { catmatIndexCount, upsertCatmatIndexItems } from "@/modules/coverage/catmat-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Record<string, string | number | boolean | undefined>;

function clean(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function makeUrl(baseUrl: string, params: Params) {
  const url = new URL(COMPRAS_GOV_CATMAT_ENDPOINT, `${baseUrl.replace(/\/$/, "")}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

async function consulta(label: string, baseUrl: string, params: Params) {
  const url = makeUrl(baseUrl, params);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    const text = await response.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    const resultado = Array.isArray(json?.resultado) ? json.resultado : [];
    return {
      label,
      sourceUrl: url.toString(),
      params,
      httpStatus: response.status,
      ok: response.ok,
      durationMs: Date.now() - startedAt,
      totalRegistros: json?.totalRegistros,
      totalPaginas: json?.totalPaginas,
      paginasRestantes: json?.paginasRestantes,
      resultadoLength: resultado.length,
      firstRawItems: resultado.slice(0, 3),
      rawTextPreview: resultado.length ? undefined : text.slice(0, 700),
    };
  } catch (error) {
    return { label, sourceUrl: url.toString(), params, ok: false, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

async function importarPagina(baseUrl: string, page: number) {
  const url = makeUrl(baseUrl, { pagina: page });
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const parsed = comprasGovApiResponseSchema.parse(await response.json());
  const items = [];
  for (const raw of parsed.resultado) {
    const item = comprasGovCatalogItemSchema.safeParse(raw);
    if (item.success) items.push(item.data);
  }
  await upsertCatmatIndexItems(items);
  return { page, received: parsed.resultado.length, accepted: items.length, totalPaginas: parsed.totalPaginas, paginasRestantes: parsed.paginasRestantes };
}

export async function GET(request: Request) {
  const actor = await getRouteActor();
  if (!actor) return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });

  const url = new URL(request.url);
  const terms = clean(url.searchParams.get("terms") ?? "coturno");
  const first = terms.split(/\s+/).find((token) => token.length >= 3) ?? terms;
  const config = getComprasGovConfig();

  if (url.searchParams.get("index") === "1") {
    const from = Math.max(1, Number(url.searchParams.get("from") ?? "1"));
    const pages = Math.min(15, Math.max(1, Number(url.searchParams.get("pages") ?? "5")));
    const imports = [];
    for (let page = from; page < from + pages; page += 1) imports.push(await importarPagina(config.baseUrl, page));
    return NextResponse.json({ diagnostic: "CATMAT_INDEX_WARMED", from, pages, nextFrom: from + pages, indexSize: await catmatIndexCount(), imports });
  }

  const paramsList: [string, Params][] = [
    ["descricaoItem completo", { pagina: 1, descricaoItem: terms }],
    ["nomeItem completo", { pagina: 1, nomeItem: terms }],
    ["descricaoMaterial completo", { pagina: 1, descricaoMaterial: terms }],
    ["termo completo", { pagina: 1, termo: terms }],
    ["q completo", { pagina: 1, q: terms }],
    ["sem filtro textual", { pagina: 1 }],
  ];
  const attempts = await Promise.all(paramsList.map(([label, params]) => consulta(label, config.baseUrl, params)));

  return NextResponse.json({ diagnostic: "CATMAT_DIAGNOSTICO_BRUTO_V3", endpoint: COMPRAS_GOV_CATMAT_ENDPOINT, baseUrl: config.baseUrl, terms, indexSize: await catmatIndexCount(), attempts });
}
