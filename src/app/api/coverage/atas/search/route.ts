import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { demoMemoryFallbackAllowed, getRouteActor } from "@/modules/auth/route-actor";
import {
  activeCatalogMappingForNeed,
  activeCatalogMappingForNeedSync,
  persistenceMode,
  searchArpsForConfirmedCatmat,
} from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

type ArpRequestBody = {
  needId?: string;
  analysisId?: string;
  catalogMappingId?: string;
  catmatCode?: string;
  dateStart?: string;
  dateEnd?: string;
  dataVigenciaInicialMin?: string;
  dataVigenciaInicialMax?: string;
  requestId?: string;
};

function safeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function routeLog(event: string, fields: Record<string, unknown>) {
  console.info(event, JSON.stringify(fields));
}

function failure(
  status: number,
  requestId: string,
  code: string,
  message: string,
  retryable: boolean,
  trace?: Record<string, unknown>,
) {
  routeLog("ARP_RESPONSE_SENT", {
    requestId,
    stage: "ARP_SEARCH_FAILED",
    durationMs: trace?.durationMs,
    count: 0,
    status: code,
  });

  return NextResponse.json(
    {
      ok: false,
      stage: "ARP_SEARCH_FAILED",
      requestId,
      code,
      message,
      retryable,
      trace,
    },
    { status },
  );
}

export async function POST(request: Request) {
  const routeStartedAt = Date.now();
  let body: ArpRequestBody = {};
  let requestId: string = randomUUID();

  try {
    body = (await request.json()) as ArpRequestBody;
    requestId = safeText(body.requestId) ?? requestId;
  } catch {
    return failure(400, requestId, "INVALID_REQUEST", "JSON invalido.", false, {
      durationMs: Date.now() - routeStartedAt,
    });
  }

  const needId = safeText(body.needId);
  const analysisId = safeText(body.analysisId);
  const catalogMappingId = safeText(body.catalogMappingId);
  const catmatCode = safeText(body.catmatCode);

  routeLog("ARP_ROUTE_RECEIVED", {
    requestId,
    needId,
    analysisId,
    catmatCode,
    stage: "ARP_ROUTE_RECEIVED",
    durationMs: 0,
    count: 0,
    status: "RECEIVED",
  });

  const actor = await getRouteActor();
  if (!actor) {
    return failure(401, requestId, "UNAUTHORIZED", "Autenticacao obrigatoria.", false, {
      requestId,
      needId,
      analysisId,
      catmatCode,
      durationMs: Date.now() - routeStartedAt,
    });
  }

  if (!needId) {
    return failure(400, requestId, "MISSING_NEED_ID", "needId obrigatorio.", false, {
      requestId,
      analysisId,
      catmatCode,
      durationMs: Date.now() - routeStartedAt,
    });
  }

  if (!catmatCode) {
    return failure(400, requestId, "MISSING_CATMAT_CODE", "catmatCode obrigatorio.", false, {
      requestId,
      needId,
      analysisId,
      durationMs: Date.now() - routeStartedAt,
    });
  }

  if (!catalogMappingId) {
    return failure(400, requestId, "MISSING_CATALOG_MAPPING_ID", "catalogMappingId obrigatorio.", false, {
      requestId,
      needId,
      analysisId,
      catmatCode,
      durationMs: Date.now() - routeStartedAt,
    });
  }

  const mode = persistenceMode();
  if (
    mode !== "postgresql" &&
    process.env.MCL_ALLOW_MEMORY_FALLBACK !== "true" &&
    !demoMemoryFallbackAllowed() &&
    process.env.NODE_ENV !== "test"
  ) {
    return failure(
      503,
      requestId,
      "MEMORY_FALLBACK_DISABLED",
      "DATABASE_URL nao configurada e MCL_ALLOW_MEMORY_FALLBACK=true nao foi definido.",
      false,
      {
        requestId,
        needId,
        analysisId,
        catmatCode,
        persistenceMode: mode,
        durationMs: Date.now() - routeStartedAt,
      },
    );
  }

  try {
    const state = getDemoState();
    const mapping = mode === "postgresql"
      ? await activeCatalogMappingForNeed(state, needId)
      : activeCatalogMappingForNeedSync(state, needId);

    if (!mapping) {
      return failure(400, requestId, "NO_CATMAT_MAPPING", "Confirme um CATMAT antes de consultar atas.", false, {
        requestId,
        needId,
        analysisId,
        catmatCode,
        persistenceMode: mode,
        durationMs: Date.now() - routeStartedAt,
      });
    }

    if (mapping.id !== catalogMappingId) {
      return failure(400, requestId, "INVALID_CATALOG_MAPPING_ID", "O mapeamento informado nao e o CATMAT ativo da necessidade.", false, {
        requestId,
        needId,
        analysisId,
        catalogMappingId,
        activeCatalogMappingId: mapping.id,
        catmatCode,
        persistenceMode: mode,
        durationMs: Date.now() - routeStartedAt,
      });
    }

    if (mapping.needId !== needId) {
      return failure(400, requestId, "INVALID_MAPPING_NEED", "O mapeamento nao pertence ao material da necessidade.", false, {
        requestId,
        needId,
        analysisId,
        catalogMappingId,
        catmatCode,
        persistenceMode: mode,
        durationMs: Date.now() - routeStartedAt,
      });
    }

    if (mapping.externalItemCode !== catmatCode) {
      return failure(400, requestId, "INVALID_CATMAT_CODE", "O CATMAT informado nao corresponde ao mapeamento confirmado.", false, {
        requestId,
        needId,
        analysisId,
        catalogMappingId,
        activeCatmatCode: mapping.externalItemCode,
        catmatCode,
        persistenceMode: mode,
        durationMs: Date.now() - routeStartedAt,
      });
    }

    if (mapping.status !== "ACTIVE" && (mapping.status as string) !== "CONFIRMED") {
      return failure(400, requestId, "INVALID_MAPPING_STATUS", "O status do mapeamento deve ser ACTIVE ou CONFIRMED.", false, {
        requestId,
        needId,
        analysisId,
        catalogMappingId,
        catmatCode,
        persistenceMode: mode,
        durationMs: Date.now() - routeStartedAt,
      });
    }

    routeLog("ARP_MAPPING_VALIDATED", {
      requestId,
      needId,
      analysisId,
      catmatCode,
      stage: "ARP_MAPPING_VALIDATED",
      durationMs: Date.now() - routeStartedAt,
      count: 1,
      status: mapping.status,
    });

    const result = await searchArpsForConfirmedCatmat(
      state,
      {
        ...body,
        needId,
        analysisId,
        catalogMappingId,
        catmatCode,
        dataVigenciaInicialMin: body.dateStart ?? body.dataVigenciaInicialMin,
        dataVigenciaInicialMax: body.dateEnd ?? body.dataVigenciaInicialMax,
        requestId,
      },
      {
        actorId: actor.id,
        organizationId: actor.organizationId,
        userAgent: request.headers.get("user-agent") ?? "mcl-web",
        requestId,
      },
    );

    const trace = {
      ...result.query,
      requestId,
      analysisId,
      catalogMappingId: mapping.id,
      catmatCode: mapping.externalItemCode,
      totalRegistros: result.totalRegistros,
      totalPaginas: result.totalPaginas,
      paginasRestantes: result.paginasRestantes,
      pagesConsulted: result.pagesConsulted,
      durationMs: result.durationMs,
      timeoutMs: result.timeoutMs,
      persistenceMode: mode,
    };
    const stage = result.entries.length > 0 ? "ARP_SEARCH_COMPLETED" : "ARP_SEARCH_EMPTY";

    routeLog("ARP_RESPONSE_SENT", {
      requestId,
      needId,
      analysisId,
      catmatCode: mapping.externalItemCode,
      stage,
      durationMs: Date.now() - routeStartedAt,
      count: result.entries.length,
      status: "OK",
    });

    return NextResponse.json({
      ok: true,
      stage,
      requestId,
      catmatCode: mapping.externalItemCode,
      count: result.entries.length,
      items: result.entries,
      synthesis: result.synthesis,
      trace,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar atas.";
    const isTimeout =
      message.toLowerCase().includes("tempo limite") ||
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("abort");

    routeLog("ARP_EXTERNAL_FAILED", {
      requestId,
      needId,
      analysisId,
      catmatCode,
      stage: "ARP_SEARCH_FAILED",
      durationMs: Date.now() - routeStartedAt,
      count: 0,
      status: isTimeout ? "TIMEOUT" : "QUERY_ERROR",
    });

    return failure(400, requestId, isTimeout ? "TIMEOUT" : "QUERY_ERROR", message, true, {
      requestId,
      needId,
      analysisId,
      catalogMappingId,
      catmatCode,
      persistenceMode: mode,
      durationMs: Date.now() - routeStartedAt,
    });
  }
}
