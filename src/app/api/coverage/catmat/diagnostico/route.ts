import { NextResponse } from "next/server";
import { getRouteActor } from "@/modules/auth/route-actor";
import { getComprasGovConfig } from "@/modules/connectors/compras-gov/config";
import { COMPRAS_GOV_CATMAT_ENDPOINT } from "@/modules/connectors/compras-gov/constants";

export const runtime = "nodejs";

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
      envelopeKeys: json && typeof json === "object" ? Object.keys(json) : [],
      totalRegistros: json?.totalRegistros,
      totalPaginas: json?.totalPaginas,
      paginasRestantes: json?.paginasRestantes,
      resultadoLength: resultado.length,
      firstRawItems: resultado.slice(0, 3),
      rawTextPreview: resultado.length ? undefined : text.slice(0, 700),
    };
  } catch (error) {
    return {
      label,
      sourceUrl: url.toString(),
      params,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function GET(request: Request) {
  const actor = await getRouteActor();
  if (!actor) return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });

  const url = new URL(request.url);
  const terms = clean(url.searchParams.get("terms") ?? "coturno");
  const first = terms.split(/\s+/).find((token) => token.length >= 3) ?? terms;
  const upper = terms.toUpperCase();
  const config = getComprasGovConfig();

  const paramsList: [string, Params][] = [
    ["descricaoItem completo", { pagina: 1, descricaoItem: terms }],
    ["descricaoItem completo upper", { pagina: 1, descricaoItem: upper }],
    ["descricaoItem primeiro termo", { pagina: 1, descricaoItem: first }],
    ["descricaoItem primeiro termo status true", { pagina: 1, descricaoItem: first, statusItem: true }],
    ["nomeItem completo", { pagina: 1, nomeItem: terms }],
    ["nomeItem upper", { pagina: 1, nomeItem: upper }],
    ["descricaoMaterial completo", { pagina: 1, descricaoMaterial: terms }],
    ["descricao completo", { pagina: 1, descricao: terms }],
    ["termo completo", { pagina: 1, termo: terms }],
    ["termoBusca completo", { pagina: 1, termoBusca: terms }],
    ["palavraChave completo", { pagina: 1, palavraChave: terms }],
    ["q completo", { pagina: 1, q: terms }],
    ["sem filtro textual", { pagina: 1 }],
  ];

  const attempts = await Promise.all(paramsList.map(([label, params]) => consulta(label, config.baseUrl, params)));

  return NextResponse.json({
    diagnostic: "CATMAT_DIAGNOSTICO_BRUTO_V2",
    endpoint: COMPRAS_GOV_CATMAT_ENDPOINT,
    baseUrl: config.baseUrl,
    terms,
    attempts,
  });
}
