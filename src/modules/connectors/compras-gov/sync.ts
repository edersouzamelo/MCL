import { randomUUID } from "node:crypto";
import type {
  ConnectorHealth,
  ConnectorRun,
  DemoState,
  ExternalProcessingStatus,
  QuarantineRecord,
} from "@/modules/domain/types";
import { appendAuditLogToState } from "@/server/demo-store";
import { getComprasGovConfig, type ComprasGovConfig } from "./config";
import {
  COMPRAS_GOV_ARP_ITEM_ENDPOINT,
  COMPRAS_GOV_CONNECTOR_ID,
  COMPRAS_GOV_MAPPING_VERSION,
  COMPRAS_GOV_SOURCE_SYSTEM,
} from "./constants";
import { createComprasGovClient } from "./http";
import { externalIdForArpItem, normalizeArpItem } from "./normalizers";
import { comprasGovApiResponseSchema, comprasGovArpItemSchema } from "./schemas";

type SyncOptions = {
  actorId: string;
  organizationId?: string;
  userAgent?: string;
  requestId?: string;
  config?: ComprasGovConfig;
  fetchImpl?: typeof fetch;
};

type SyncMetrics = {
  recordsRead: number;
  acceptedRecords: number;
  updatedRecords: number;
  duplicateRecords: number;
  rejectedRecords: number;
  quarantinedRecords: number;
};

let activeSync: Promise<ConnectorRun> | undefined;

function connectorHealth(state: DemoState): ConnectorHealth {
  let connector = state.connectors.find((candidate) => candidate.id === COMPRAS_GOV_CONNECTOR_ID);
  if (!connector) {
    connector = {
      id: COMPRAS_GOV_CONNECTOR_ID,
      name: "COMPRAS.GOV - API PUBLICA OFICIAL",
      sourceSystem: COMPRAS_GOV_SOURCE_SYSTEM,
      status: "ATRASADO",
      lastRunAt: new Date().toISOString(),
      latencyMs: 0,
      recordsImported: 0,
      quarantinedRecords: 0,
      message: "Conector oficial somente leitura aguardando primeira sincronizacao.",
      endpoint: COMPRAS_GOV_ARP_ITEM_ENDPOINT,
      mappingVersion: COMPRAS_GOV_MAPPING_VERSION,
    };
    state.connectors.unshift(connector);
  }
  return connector;
}

function upsertById<T extends { id: string }>(collection: T[], record: T) {
  const index = collection.findIndex((candidate) => candidate.id === record.id);
  if (index === -1) {
    collection.unshift(record);
    return "ACCEPTED" satisfies ExternalProcessingStatus;
  }
  collection[index] = { ...collection[index], ...record };
  return "UPDATED" satisfies ExternalProcessingStatus;
}

function pushQuarantine(state: DemoState, reason: string, payload: Record<string, unknown>, sourceRecordId = "sem-identificador") {
  const record: QuarantineRecord = {
    id: randomUUID(),
    sourceSystem: COMPRAS_GOV_SOURCE_SYSTEM,
    sourceRecordId,
    reason,
    payload,
    createdAt: new Date().toISOString(),
  };
  state.quarantine.unshift(record);
  return record;
}

function requestParams(config: ComprasGovConfig, page: number) {
  return {
    pagina: page,
    dataVigenciaInicialMin: config.filters.dateStart,
    dataVigenciaInicialMax: config.filters.dateEnd,
    tipoItem: "Material",
    codigoUnidadeGerenciadora: config.filters.unitCode,
    codigoItem: config.filters.catmatCode,
    codigoModalidadeCompra: config.filters.modalityCode,
  };
}

function hasRelevantSyncFilter(config: ComprasGovConfig) {
  return Boolean(config.filters.catmatCode || config.filters.unitCode);
}

function applyKeywordFilter(raw: unknown[], keyword?: string) {
  if (!keyword) {
    return raw;
  }
  const normalized = keyword.toLocaleLowerCase("pt-BR");
  return raw.filter((record) => JSON.stringify(record).toLocaleLowerCase("pt-BR").includes(normalized));
}

function applyCanonicalRecord(state: DemoState, normalized: ReturnType<typeof normalizeArpItem>) {
  upsertById(state.organizations, normalized.organization);
  upsertById(state.supplyItems, normalized.supplyItem);
  upsertById(state.itemVariants, normalized.itemVariant);
  upsertById(state.acquisitionInstruments, normalized.acquisitionInstrument);
  upsertById(state.documents, normalized.documentReference);
}

function finishRun(run: ConnectorRun, status: ConnectorRun["status"], message: string, startedMs: number) {
  run.status = status;
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.now() - startedMs;
  run.message = message;
  return run;
}

function updateHealth(
  connector: ConnectorHealth,
  run: ConnectorRun,
  metrics: SyncMetrics,
  status: ConnectorHealth["status"],
  message: string,
) {
  connector.status = status;
  connector.lastRunAt = run.startedAt;
  connector.lastRunId = run.id;
  connector.lastSuccessAt = status === "SAUDAVEL" ? run.finishedAt : connector.lastSuccessAt;
  connector.latencyMs = run.durationMs;
  connector.durationMs = run.durationMs;
  connector.endpoint = run.endpoint;
  connector.recordsRead = metrics.recordsRead;
  connector.recordsImported = metrics.acceptedRecords + metrics.updatedRecords;
  connector.acceptedRecords = metrics.acceptedRecords;
  connector.updatedRecords = metrics.updatedRecords;
  connector.duplicateRecords = metrics.duplicateRecords;
  connector.rejectedRecords = metrics.rejectedRecords;
  connector.quarantinedRecords = metrics.quarantinedRecords;
  connector.message = message;
  connector.mappingVersion = COMPRAS_GOV_MAPPING_VERSION;
}

async function executeComprasGovSync(state: DemoState, options: SyncOptions): Promise<ConnectorRun> {
  const config = options.config ?? getComprasGovConfig();
  const connector = connectorHealth(state);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const metrics: SyncMetrics = {
    recordsRead: 0,
    acceptedRecords: 0,
    updatedRecords: 0,
    duplicateRecords: 0,
    rejectedRecords: 0,
    quarantinedRecords: 0,
  };
  const run: ConnectorRun = {
    id: randomUUID(),
    connectorId: COMPRAS_GOV_CONNECTOR_ID,
    status: "RUNNING",
    startedAt,
    endpoint: COMPRAS_GOV_ARP_ITEM_ENDPOINT,
    recordsRead: 0,
    acceptedRecords: 0,
    updatedRecords: 0,
    duplicateRecords: 0,
    rejectedRecords: 0,
    quarantinedRecords: 0,
    durationMs: 0,
    mappingVersion: COMPRAS_GOV_MAPPING_VERSION,
    message: "Sincronizacao em andamento.",
  };

  state.connectorRuns.unshift(run);
  connector.status = "SINCRONIZANDO";
  connector.message = "Sincronizacao em andamento.";

  if (!config.syncEnabled) {
    finishRun(run, "SKIPPED", "Sincronizacao desabilitada por COMPRAS_GOV_SYNC_ENABLED=false.", startedMs);
    updateHealth(connector, run, metrics, "DESABILITADO", run.message);
    return run;
  }

  if (!hasRelevantSyncFilter(config)) {
    finishRun(
      run,
      "SKIPPED",
      "Sincronizacao generica bloqueada: informe CATMAT confirmado ou UASG para evitar importacao sem contexto.",
      startedMs,
    );
    updateHealth(connector, run, metrics, "DESABILITADO", run.message);
    appendAuditLogToState(state, {
      actorId: options.actorId,
      action: "COMPRAS_GOV_SYNC_BLOQUEADA",
      resourceType: "CONNECTOR_RUN",
      resourceId: run.id,
      organizationId: options.organizationId,
      requestId: options.requestId,
      userAgent: options.userAgent,
      outcome: "NEGADO",
      reason: run.message,
      metadata: { endpoint: run.endpoint, mappingVersion: run.mappingVersion },
    });
    return run;
  }

  try {
    const client = createComprasGovClient(config, options.fetchImpl);
    for (let page = 1; page <= config.maxPages && metrics.recordsRead < config.pageSize; page += 1) {
      const { data, url } = await client.getJson(
        COMPRAS_GOV_ARP_ITEM_ENDPOINT,
        requestParams(config, page),
        comprasGovApiResponseSchema,
      );
      const records = applyKeywordFilter(data.resultado, config.filters.keyword);

      if (records.length === 0) {
        break;
      }

      for (const rawRecord of records) {
        if (metrics.recordsRead >= config.pageSize) {
          break;
        }
        metrics.recordsRead += 1;
        const rawPayload = rawRecord && typeof rawRecord === "object" ? (rawRecord as Record<string, unknown>) : { rawRecord };
        const parsed = comprasGovArpItemSchema.safeParse(rawRecord);

        if (!parsed.success) {
          metrics.rejectedRecords += 1;
          metrics.quarantinedRecords += 1;
          pushQuarantine(
            state,
            parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
            rawPayload,
          );
          continue;
        }

        const normalized = normalizeArpItem(parsed.data, url, new Date().toISOString());
        const existing = state.externalRecords.find(
          (record) =>
            record.connectorId === normalized.externalRecord.connectorId &&
            record.externalType === normalized.externalRecord.externalType &&
            record.externalId === normalized.externalRecord.externalId,
        );
        const status: ExternalProcessingStatus = existing
          ? existing.payloadHash === normalized.externalRecord.payloadHash
            ? "DUPLICATE"
            : "UPDATED"
          : "ACCEPTED";

        normalized.externalRecord.processingStatus = status;

        if (existing) {
          existing.fetchedAt = normalized.externalRecord.fetchedAt;
          existing.sourceUrl = normalized.externalRecord.sourceUrl;
          existing.sourceUpdatedAt = normalized.externalRecord.sourceUpdatedAt;
          existing.payload = normalized.externalRecord.payload;
          existing.payloadHash = normalized.externalRecord.payloadHash;
          existing.processingStatus = status;
          existing.updatedAt = normalized.externalRecord.updatedAt;
        } else {
          state.externalRecords.unshift(normalized.externalRecord);
        }

        if (status === "DUPLICATE") {
          metrics.duplicateRecords += 1;
        } else {
          applyCanonicalRecord(state, normalized);
          if (status === "UPDATED") {
            metrics.updatedRecords += 1;
          } else {
            metrics.acceptedRecords += 1;
          }
        }
      }

      if (data.paginasRestantes <= 0) {
        break;
      }
    }

    run.recordsRead = metrics.recordsRead;
    run.acceptedRecords = metrics.acceptedRecords;
    run.updatedRecords = metrics.updatedRecords;
    run.duplicateRecords = metrics.duplicateRecords;
    run.rejectedRecords = metrics.rejectedRecords;
    run.quarantinedRecords = metrics.quarantinedRecords;
    finishRun(run, "SUCCESS", `${metrics.recordsRead} registros lidos do Compras.gov.br.`, startedMs);
    updateHealth(connector, run, metrics, "SAUDAVEL", run.message);
    appendAuditLogToState(state, {
      actorId: options.actorId,
      action: "COMPRAS_GOV_SYNC_EXECUTADA",
      resourceType: "CONNECTOR_RUN",
      resourceId: run.id,
      organizationId: options.organizationId,
      requestId: options.requestId,
      userAgent: options.userAgent,
      outcome: "SUCESSO",
      reason: run.message,
      metadata: { ...metrics, endpoint: run.endpoint, mappingVersion: run.mappingVersion },
    });
    return run;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida ao sincronizar Compras.gov.br.";
    run.recordsRead = metrics.recordsRead;
    run.acceptedRecords = metrics.acceptedRecords;
    run.updatedRecords = metrics.updatedRecords;
    run.duplicateRecords = metrics.duplicateRecords;
    run.rejectedRecords = metrics.rejectedRecords;
    run.quarantinedRecords = metrics.quarantinedRecords;
    finishRun(run, "FAILED", message.slice(0, 240), startedMs);
    updateHealth(connector, run, metrics, "FALHA", run.message);
    appendAuditLogToState(state, {
      actorId: options.actorId,
      action: "COMPRAS_GOV_SYNC_FALHOU",
      resourceType: "CONNECTOR_RUN",
      resourceId: run.id,
      organizationId: options.organizationId,
      requestId: options.requestId,
      userAgent: options.userAgent,
      outcome: "ERRO",
      reason: run.message,
      metadata: { endpoint: run.endpoint, mappingVersion: run.mappingVersion },
    });
    return run;
  }
}

export function isComprasGovSyncRunning() {
  return Boolean(activeSync);
}

export async function runComprasGovSync(state: DemoState, options: SyncOptions) {
  if (activeSync) {
    throw new Error("Ja existe uma sincronizacao do Compras.gov.br em andamento.");
  }

  activeSync = executeComprasGovSync(state, options).finally(() => {
    activeSync = undefined;
  });

  return activeSync;
}

export function resetComprasGovSyncLockForTests() {
  activeSync = undefined;
}

export { externalIdForArpItem };
