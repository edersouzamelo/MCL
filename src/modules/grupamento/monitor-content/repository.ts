import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type {
  MonitorDocumentExtraction,
  MonitorDocumentSceneDto,
  MonitorDocumentScenePayload,
} from "@/modules/grupamento/monitor-content/types";

export function monitorContentChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function bytes(value: Buffer) {
  const copy = new Uint8Array(value.length);
  copy.set(value);
  return copy as Uint8Array<ArrayBuffer>;
}

export async function saveMonitorUploadChunk(input: {
  uploadId: string;
  chunkIndex: number;
  chunkCount: number;
  organizationId: string;
  monitorId: number;
  fileName: string;
  mimeType: string;
  totalSize: number;
  uploadedBy: string;
  data: Buffer;
}) {
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    await tx.monitorContentUploadChunk.deleteMany({ where: { createdAt: { lt: staleBefore } } });
    await tx.monitorContentUploadChunk.deleteMany({
      where: { uploadId: input.uploadId, chunkIndex: input.chunkIndex },
    });
    return tx.monitorContentUploadChunk.create({ data: { ...input, data: bytes(input.data) } });
  });
}

export async function assembleMonitorUpload(input: {
  uploadId: string;
  organizationId: string;
  uploadedBy: string;
}) {
  const parts = await prisma.monitorContentUploadChunk.findMany({
    where: {
      uploadId: input.uploadId,
      organizationId: input.organizationId,
      uploadedBy: input.uploadedBy,
    },
    orderBy: { chunkIndex: "asc" },
  });
  if (!parts.length) throw new Error("Carga documental não encontrada ou expirada.");

  const expectedCount = parts[0].chunkCount;
  if (parts.length !== expectedCount) throw new Error(`Carga incompleta: ${parts.length}/${expectedCount} blocos recebidos.`);
  for (let index = 0; index < expectedCount; index += 1) {
    if (parts[index]?.chunkIndex !== index) throw new Error(`Carga incompleta: bloco ${index + 1} ausente.`);
  }

  const metadata = parts[0];
  if (parts.some((part) =>
    part.monitorId !== metadata.monitorId ||
    part.fileName !== metadata.fileName ||
    part.mimeType !== metadata.mimeType ||
    part.totalSize !== metadata.totalSize ||
    part.chunkCount !== metadata.chunkCount
  )) throw new Error("Metadados divergentes entre blocos da mesma carga.");

  const buffer = Buffer.concat(parts.map((part) => Buffer.from(part.data)));
  if (buffer.length !== metadata.totalSize) throw new Error("Tamanho final da carga diverge do arquivo informado.");

  return {
    buffer,
    monitorId: metadata.monitorId,
    fileName: metadata.fileName,
    mimeType: metadata.mimeType,
    totalSize: metadata.totalSize,
  };
}

export async function deleteMonitorUpload(uploadId: string, organizationId: string) {
  return prisma.monitorContentUploadChunk.deleteMany({ where: { uploadId, organizationId } });
}

export async function persistMonitorContentImport(input: {
  organizationId: string;
  monitorId: number;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  importedBy: string;
  extraction: MonitorDocumentExtraction;
}) {
  const checksum = monitorContentChecksum(input.buffer);
  const existing = await prisma.monitorContentImport.findUnique({
    where: {
      organizationId_monitorId_checksum: {
        organizationId: input.organizationId,
        monitorId: input.monitorId,
        checksum,
      },
    },
    include: { scenes: { orderBy: { sceneOrder: "asc" } } },
  });
  if (existing) return { importRecord: existing, deduplicated: true };

  const importId = randomUUID();
  const assetIds = new Map<string, string>();
  const assetRows = input.extraction.assets.map((asset) => {
    const id = randomUUID();
    assetIds.set(asset.key, id);
    return {
      id,
      importId,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      data: bytes(asset.data),
    };
  });

  const sceneRows = input.extraction.scenes.map((scene, index) => {
    const payload = { ...scene.payload };
    const sourceKeys = payload.assetKeys ?? [];
    delete payload.assetKeys;
    const assetIdsForScene = sourceKeys.map((key) => assetIds.get(key)).filter((id): id is string => Boolean(id));
    const normalizedPayload: MonitorDocumentScenePayload = {
      ...payload,
      assetIds: assetIdsForScene.length ? assetIdsForScene : undefined,
    };
    return {
      id: randomUUID(),
      importId,
      sceneOrder: index,
      sceneType: scene.sceneType,
      title: scene.title,
      payload: json(normalizedPayload),
      sourcePage: scene.sourcePage,
      durationSeconds: null,
      active: true,
    };
  });

  const importRecord = await prisma.$transaction(async (tx) => {
    await tx.monitorContentImport.create({
      data: {
        id: importId,
        organizationId: input.organizationId,
        monitorId: input.monitorId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.buffer.length,
        checksum,
        status: "PREVIEW",
        sceneCount: sceneRows.length,
        warnings: json(input.extraction.warnings),
        rawFile: bytes(input.buffer),
        importedBy: input.importedBy,
      },
    });
    if (assetRows.length) await tx.monitorContentAsset.createMany({ data: assetRows });
    if (sceneRows.length) await tx.monitorContentScene.createMany({ data: sceneRows });
    return tx.monitorContentImport.findUniqueOrThrow({
      where: { id: importId },
      include: { scenes: { orderBy: { sceneOrder: "asc" } } },
    });
  });

  return { importRecord, deduplicated: false };
}

export async function listMonitorContentImports(organizationId: string, monitorId: number) {
  return prisma.monitorContentImport.findMany({
    where: { organizationId, monitorId },
    orderBy: { importedAt: "desc" },
    take: 12,
    select: {
      id: true,
      monitorId: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      checksum: true,
      status: true,
      sceneCount: true,
      warnings: true,
      importedBy: true,
      importedAt: true,
      approvedBy: true,
      approvedAt: true,
      archivedAt: true,
      scenes: {
        orderBy: { sceneOrder: "asc" },
        select: {
          id: true,
          sceneOrder: true,
          sceneType: true,
          title: true,
          sourcePage: true,
          payload: true,
        },
      },
    },
  });
}

export async function setMonitorContentStatus(input: {
  id: string;
  organizationId: string;
  actorId: string;
  status: "APPROVED" | "ARCHIVED";
}) {
  const existing = await prisma.monitorContentImport.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
  });
  if (!existing) throw new Error("Importação documental não encontrada.");

  if (input.status === "APPROVED") {
    return prisma.monitorContentImport.update({
      where: { id: input.id },
      data: {
        status: "APPROVED",
        approvedBy: input.actorId,
        approvedAt: new Date(),
        archivedBy: null,
        archivedAt: null,
      },
    });
  }

  return prisma.monitorContentImport.update({
    where: { id: input.id },
    data: {
      status: "ARCHIVED",
      archivedBy: input.actorId,
      archivedAt: new Date(),
    },
  });
}

export async function getApprovedMonitorScenes(organizationId: string, monitorId: number): Promise<MonitorDocumentSceneDto[]> {
  const rows = await prisma.monitorContentScene.findMany({
    where: {
      active: true,
      import: {
        organizationId,
        monitorId,
        status: "APPROVED",
      },
    },
    orderBy: [
      { import: { approvedAt: "asc" } },
      { importId: "asc" },
      { sceneOrder: "asc" },
    ],
    select: {
      id: true,
      importId: true,
      sceneOrder: true,
      sceneType: true,
      title: true,
      payload: true,
      sourcePage: true,
      import: {
        select: {
          monitorId: true,
          fileName: true,
          importedAt: true,
          approvedAt: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    importId: row.importId,
    monitorId: row.import.monitorId,
    sceneOrder: row.sceneOrder,
    sceneType: row.sceneType as MonitorDocumentSceneDto["sceneType"],
    title: row.title,
    payload: row.payload as unknown as MonitorDocumentScenePayload,
    sourcePage: row.sourcePage,
    sourceFileName: row.import.fileName,
    sourceImportedAt: row.import.importedAt.toISOString(),
    approvedAt: row.import.approvedAt?.toISOString() ?? null,
  }));
}

export async function getMonitorContentAsset(id: string, organizationId: string) {
  return prisma.monitorContentAsset.findFirst({
    where: { id, import: { organizationId } },
    select: { id: true, fileName: true, mimeType: true, data: true },
  });
}

export async function getMonitorContentSource(id: string, organizationId: string) {
  return prisma.monitorContentImport.findFirst({
    where: { id, organizationId },
    select: { id: true, fileName: true, mimeType: true, rawFile: true },
  });
}
