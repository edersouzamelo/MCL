import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import {
  getApprovedMonitorScenes,
  getMonitorContentForReprocess,
  replaceApprovedMonitorContentExtraction,
} from "@/modules/grupamento/monitor-content/repository";
import {
  CURRENT_MONITOR_EXTRACTION_VERSION,
  monitorSceneNeedsRefresh,
} from "@/modules/grupamento/monitor-content/version";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const AUTO_REFRESH_TIMEOUT_MS = 25_000;

async function withTimeout<T>(promise: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Atualização automática da apresentação excedeu 25 segundos.")), AUTO_REFRESH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const monitorId = Number(new URL(request.url).searchParams.get("monitorId"));
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  const reader = await getMonitorReader(monitorId);
  if (!reader) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });

  let scenes = await getApprovedMonitorScenes(reader.organizationId, monitorId);
  const staleScene = scenes.find(monitorSceneNeedsRefresh);

  if (staleScene) {
    const source = await getMonitorContentForReprocess(staleScene.importId, reader.organizationId);
    if (source?.status === "APPROVED") {
      try {
        const extraction = await withTimeout(extractMonitorDocument(Buffer.from(source.rawFile), source.fileName));
        if (!extraction.scenes.length) throw new Error("A atualização automática não gerou cenas válidas.");

        await replaceApprovedMonitorContentExtraction({
          id: source.id,
          organizationId: reader.organizationId,
          extraction,
        });

        await prisma.auditLog.create({
          data: {
            id: randomUUID(),
            occurredAt: new Date(),
            actorId: "system:monitor-extractor",
            action: "MONITOR_CONTENT_AUTO_REPROCESS",
            resourceType: "MONITOR_CONTENT",
            resourceId: source.id,
            organizationId: reader.organizationId,
            requestId: randomUUID(),
            userAgent: request.headers.get("user-agent") ?? "mcl-monitor-playlist",
            outcome: "SUCESSO",
            reason: "Conteúdo aprovado reprocessado automaticamente por mudança de versão do motor de apresentação, preservando o estado publicado.",
            metadata: {
              monitorId,
              fileName: source.fileName,
              extractionVersion: CURRENT_MONITOR_EXTRACTION_VERSION,
              sceneCount: extraction.scenes.length,
              warningCount: extraction.warnings.length,
            },
          },
        });

        scenes = await getApprovedMonitorScenes(reader.organizationId, monitorId);
      } catch (error) {
        await prisma.auditLog.create({
          data: {
            id: randomUUID(),
            occurredAt: new Date(),
            actorId: "system:monitor-extractor",
            action: "MONITOR_CONTENT_AUTO_REPROCESS",
            resourceType: "MONITOR_CONTENT",
            resourceId: source.id,
            organizationId: reader.organizationId,
            requestId: randomUUID(),
            userAgent: request.headers.get("user-agent") ?? "mcl-monitor-playlist",
            outcome: "FALHA",
            reason: error instanceof Error ? error.message : "Falha desconhecida ao atualizar apresentação.",
            metadata: {
              monitorId,
              fileName: source.fileName,
              extractionVersion: CURRENT_MONITOR_EXTRACTION_VERSION,
            },
          },
        }).catch(() => undefined);
      }
    }
  }

  return NextResponse.json({ scenes });
}
