import type { ItemCatalogMapping } from "@/modules/domain/types";
import type { ArpSearchEntry, CoverageSynthesis } from "@/modules/coverage/service";

export type AtaQueryStatus = "IDLE" | "SEARCHING_ARPS" | "COMPLETED" | "EMPTY" | "TIMEOUT" | "ERROR";

export type ArpSearchPayload = {
  needId: string;
  analysisId: string;
  catalogMappingId: string;
  catmatCode: string;
  mappingSnapshot: ItemCatalogMapping;
  dateStart: string;
  dateEnd: string;
  dataVigenciaInicialMin: string;
  dataVigenciaInicialMax: string;
  requestId: string;
};

export type ArpSearchSuccessResponse = {
  ok: true;
  stage: "ARP_SEARCH_COMPLETED" | "ARP_SEARCH_EMPTY";
  requestId: string;
  catmatCode: string;
  count: number;
  items: ArpSearchEntry[];
  synthesis?: CoverageSynthesis;
  trace?: unknown;
};

export type ArpSearchFailureResponse = {
  ok: false;
  stage: "ARP_SEARCH_FAILED";
  requestId: string;
  code: string;
  message: string;
  retryable: boolean;
  trace?: unknown;
};

export type ArpSearchResponse = ArpSearchSuccessResponse | ArpSearchFailureResponse;

export type AtaUiOutcome = {
  status: Exclude<AtaQueryStatus, "IDLE" | "SEARCHING_ARPS">;
  message?: string;
  error?: string;
  entries: ArpSearchEntry[];
  synthesis?: CoverageSynthesis;
  trace?: unknown;
};

type BuildPayloadInput = {
  needId: string;
  analysisId?: string;
  mapping: ItemCatalogMapping;
  dateStart: string;
  dateEnd: string;
  requestId: string;
};

export function sanitizeMappingSnapshot(mapping: any): any {
  if (!mapping) return undefined;

  const allowedKeys = [
    "id",
    "mclItemId",
    "mclVariantId",
    "needId",
    "externalCatalog",
    "externalItemCode",
    "externalDescription",
    "groupCode",
    "classCode",
    "pdmCode",
    "confirmedBy",
    "confirmedAt",
    "revokedAt",
    "justification",
    "status",
    "confidence",
    "mappingVersion",
    "replacesMappingId",
    "sourceCandidateId",
  ];

  const sanitized: any = {};

  for (const key of allowedKeys) {
    let value = mapping[key];
    if (value === null || value === undefined) {
      continue;
    }

    if (key === "confirmedAt" || key === "revokedAt") {
      if (value instanceof Date) {
        value = value.toISOString();
      } else if (typeof value === "object" && value !== null) {
        if (typeof (value as any).toISOString === "function") {
          value = (value as any).toISOString();
        } else {
          const dateStr = String(value);
          const parsed = new Date(dateStr);
          value = !isNaN(parsed.getTime()) ? parsed.toISOString() : undefined;
        }
      } else if (typeof value === "string") {
        const parsed = new Date(value);
        value = !isNaN(parsed.getTime()) ? parsed.toISOString() : value;
      }
    }

    if (value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function buildArpSearchPayload({
  needId,
  analysisId,
  mapping,
  dateStart,
  dateEnd,
  requestId,
}: BuildPayloadInput): ArpSearchPayload {
  return {
    needId,
    analysisId: analysisId ?? `analysis-${needId}`,
    catalogMappingId: mapping.id,
    catmatCode: mapping.externalItemCode,
    mappingSnapshot: sanitizeMappingSnapshot(mapping) as ItemCatalogMapping,
    dateStart,
    dateEnd,
    dataVigenciaInicialMin: dateStart,
    dataVigenciaInicialMax: dateEnd,
    requestId,
  };
}

export function classifyArpSearchResponse(
  responseOk: boolean,
  result: ArpSearchResponse,
  catmatCode: string,
): AtaUiOutcome {
  if (!responseOk || result.ok === false) {
    if (result.ok === false && result.code === "TIMEOUT") {
      return {
        status: "TIMEOUT",
        error: result.message || "A consulta de atas excedeu o tempo limite.",
        entries: [],
        trace: result.trace,
      };
    }

    if (result.ok === false && result.code === "ARP_ITEMS_RECEIVED_BUT_SCHEMA_FILTERED") {
      return {
        status: "ERROR",
        error: result.message,
        entries: [],
        trace: result.trace,
      };
    }

    if (result.ok === false && result.code === "INTERNAL_PAYLOAD_VALIDATION") {
      return {
        status: "ERROR",
        error: `Erro de validação interna do payload (a requisição não foi enviada ao Compras.gov): ${result.message}`,
        entries: [],
        trace: result.trace,
      };
    }

    const code = result.ok === false ? result.code : "HTTP_ERROR";
    const message = result.ok === false ? result.message : "Resposta HTTP sem sucesso.";
    return {
      status: "ERROR",
      error: `Nao foi possivel concluir a consulta de atas. Codigo: ${code}. Motivo: ${message}`,
      entries: [],
      trace: result.trace,
    };
  }

  const maybeResult = result as { ok?: boolean; trace?: unknown };
  if (maybeResult.ok !== true) {
    return {
      status: "ERROR",
      error: "Nao foi possivel concluir a consulta de atas. Codigo: INVALID_RESPONSE. Motivo: JSON sem campo ok=true.",
      entries: [],
      trace: maybeResult.trace,
    };
  }

  if (result.stage === "ARP_SEARCH_EMPTY") {
    return {
      status: "EMPTY",
      message: `Nenhuma ata relacionada ao CATMAT ${catmatCode} foi encontrada no periodo consultado.`,
      entries: [],
      synthesis: result.synthesis,
      trace: result.trace,
    };
  }

  if (result.stage === "ARP_SEARCH_COMPLETED") {
    if (result.count > 0 && result.items.length > 0) {
      return {
        status: "COMPLETED",
        message: `Atas relacionadas ao CATMAT ${catmatCode} encontradas: ${result.count}.`,
        entries: result.items,
        synthesis: result.synthesis,
        trace: result.trace,
      };
    }

    return {
      status: "EMPTY",
      message: `Nenhuma ata relacionada ao CATMAT ${catmatCode} foi encontrada no periodo consultado.`,
      entries: [],
      synthesis: result.synthesis,
      trace: result.trace,
    };
  }

  const unexpected = result as { stage?: string; trace?: unknown };
  return {
    status: "ERROR",
    error: `Nao foi possivel concluir a consulta de atas. Codigo: UNEXPECTED_STAGE. Motivo: ${unexpected.stage ?? "sem stage"}`,
    entries: [],
    trace: unexpected.trace,
  };
}
