import { createHash, randomUUID } from "node:crypto";
import type {
  AcquisitionInstrument,
  DocumentReference,
  ExternalProcessingStatus,
  ExternalRecord,
  ItemVariant,
  Organization,
  SupplyItem,
} from "@/modules/domain/types";
import {
  COMPRAS_GOV_CONNECTOR_ID,
  COMPRAS_GOV_MAPPING_VERSION,
  COMPRAS_GOV_SOURCE_SYSTEM,
} from "./constants";
import type { ComprasGovArpItem } from "./schemas";

export type ComprasGovNormalizedRecord = {
  externalRecord: ExternalRecord;
  supplyItem: SupplyItem;
  itemVariant: ItemVariant;
  organization: Organization;
  acquisitionInstrument: AcquisitionInstrument;
  documentReference: DocumentReference;
};

function sortForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForHash);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortForHash(nested)]),
    );
  }
  return value;
}

export function hashPayload(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(sortForHash(payload))).digest("hex");
}

function stableSuffix(value: string, length = 14) {
  return createHash("sha1").update(value).digest("hex").slice(0, length);
}

function safeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function toIsoDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(dateOnly);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida recebida do Compras.gov.br: ${value}`);
  }
  return date.toISOString();
}

function maybeIsoDate(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return toIsoDate(value);
}

function firstSentence(value: string, maxLength = 120) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
}

export function externalIdForArpItem(item: ComprasGovArpItem) {
  return [
    item.numeroControlePncpAta ?? item.numeroAtaRegistroPreco,
    item.codigoUnidadeGerenciadora,
    item.numeroItem,
    item.codigoItem,
  ].join(":");
}

export function normalizeArpItem(
  item: ComprasGovArpItem,
  sourceUrl: string,
  fetchedAt: string,
  status: ExternalProcessingStatus = "PENDING",
): ComprasGovNormalizedRecord {
  const externalId = externalIdForArpItem(item);
  const payload = item as unknown as Record<string, unknown>;
  const payloadHash = hashPayload(payload);
  const sourceUpdatedAt = maybeIsoDate(item.dataHoraAtualizacao ?? item.dataHoraInclusao);
  const itemId = `compras-gov-item-${item.codigoItem}`;
  const variantId = `compras-gov-variant-${item.codigoItem}`;
  const instrumentId = `compras-gov-arp-${stableSuffix(externalId)}`;
  const documentId = `compras-gov-doc-${stableSuffix(item.numeroControlePncpAta ?? externalId)}`;
  const orgId = `compras-gov-uasg-${safeCode(item.codigoUnidadeGerenciadora)}`;
  const quantity = item.quantidadeHomologadaVencedor ?? item.quantidadeHomologadaItem ?? item.maximoAdesao;
  const sourceRecordId = externalId;

  return {
    externalRecord: {
      id: randomUUID(),
      connectorId: COMPRAS_GOV_CONNECTOR_ID,
      externalType: "ARP_ITEM",
      externalId,
      sourceUrl,
      fetchedAt,
      sourceUpdatedAt,
      schemaVersion: COMPRAS_GOV_MAPPING_VERSION,
      payload,
      payloadHash,
      processingStatus: status,
      createdAt: fetchedAt,
      updatedAt: fetchedAt,
    },
    supplyItem: {
      id: itemId,
      persistentCode: `CATMAT-${item.codigoItem}`,
      name: item.nomePdm ?? firstSentence(item.descricaoItem, 80),
      description: item.descricaoItem,
      supplyClass: "EXTERNAL_UNMAPPED",
      category: "PENDENTE_CORRELACAO",
      baseUnit: "nao fornecido",
      active: item.itemExcluido !== true,
      synthetic: false,
      sourceSystem: COMPRAS_GOV_SOURCE_SYSTEM,
      sourceRecordId: String(item.codigoItem),
      sourceOrigin: "PUBLICO",
      sourceUpdatedAt,
    },
    itemVariant: {
      id: variantId,
      itemId,
      sku: `CATMAT-${item.codigoItem}`,
      label: item.nomePdm ?? firstSentence(item.descricaoItem),
      size: "nao fornecido",
      unit: "nao fornecido",
      active: item.itemExcluido !== true,
    },
    organization: {
      id: orgId,
      code: `UASG-${item.codigoUnidadeGerenciadora}`,
      name: item.nomeUnidadeGerenciadora ?? `UASG ${item.codigoUnidadeGerenciadora}`,
      type: "UNIDADE_GERENCIADORA_PUBLICA",
      synthetic: false,
      active: true,
    },
    acquisitionInstrument: {
      id: instrumentId,
      persistentCode: `COMPRAS-GOV-ARP-${safeCode(externalId)}`,
      type: "ATA_DE_REGISTRO_DE_PRECOS_PUBLICA",
      reference: `${item.numeroAtaRegistroPreco} item ${item.numeroItem}`,
      supplierNameSynthetic: "",
      supplierName: item.nomeRazaoSocialFornecedor ?? undefined,
      supplierDocument: item.niFornecedor ?? undefined,
      organizationName: item.nomeUnidadeGerenciadora ?? undefined,
      organizationCode: item.codigoUnidadeGerenciadora,
      itemDescription: item.descricaoItem,
      itemCode: String(item.codigoItem),
      quantity: quantity ?? undefined,
      unitValue: item.valorUnitario ?? undefined,
      totalValue: item.valorTotal ?? undefined,
      sourceOrigin: "PUBLICO",
      sourceUrl,
      externalReference: item.numeroControlePncpAta ?? item.numeroControlePncpCompra ?? externalId,
      lastSourceUpdateAt: sourceUpdatedAt,
      confidence: 0.72,
      validFrom: toIsoDate(item.dataVigenciaInicial),
      validUntil: toIsoDate(item.dataVigenciaFinal),
      capacity: Math.max(0, Math.floor(item.maximoAdesao ?? quantity ?? 0)),
      status: item.itemExcluido ? "EXCLUIDO_NA_FONTE" : "PUBLICO_COLETADO",
      sourceSystem: COMPRAS_GOV_SOURCE_SYSTEM,
      sourceRecordId,
    },
    documentReference: {
      id: documentId,
      title: `Referencia PNCP ${item.numeroControlePncpAta ?? item.numeroControlePncpCompra ?? item.numeroAtaRegistroPreco}`,
      documentType: "REFERENCIA_PNCP_PUBLICA",
      repository: COMPRAS_GOV_SOURCE_SYSTEM,
      externalReference: item.numeroControlePncpAta ?? item.numeroControlePncpCompra ?? externalId,
      classificationLabel: "PUBLICO",
      synthetic: false,
      checksum: payloadHash,
      createdAt: fetchedAt,
    },
  };
}
