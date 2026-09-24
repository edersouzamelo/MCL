import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import {
  getMonitorContentForReprocess,
  replaceMonitorContentExtraction,
} from "@/modules/grupamento/monitor-content/repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);
const PROCESS_TIMEOUT_MS = 45_000;

async function withTimeout<T>(promise: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Reprocessamento documental excedeu 45 segundos.")), PROCESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente para reprocessar conteúdo documental." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const { importId } = await params;
  try {
    const source = await getMonitorContentForReprocess(importId, session.user.organizationId);
    if (!source) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    const buffer = Buffer.from(source.rawFile);
    const extraction = await withTimeout(extractMonitorDocument(buffer, source.fileName));
    if (!extraction.scenes.length) return NextResponse.json({ error: "O reprocessamento não gerou cenas válidas." }, { status: 422 });

    const updated = await replaceMonitorContentExtraction({
      id: importId,
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      extraction,
    });

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        occurredAt: new Date(),
        actorId: session.user.id,
        action: "MONITOR_CONTENT_REPROCESS",
        resourceType: "MONITOR_CONTENT",
        resourceId: importId,
        organizationId: session.user.organizationId,
        requestId: randomUUID(),
        userAgent: "mcl-monitor-content",
        outcome: "SUCESSO",
        reason: "Documento reprocessado com reconstrução espacial; conteúdo retornou a PREVIEW para nova aprovação humana.",
        metadata: {
          monitorId: updated.monitorId,
          fileName: updated.fileName,
          sceneCount: updated.sceneCount,
          warningCount: Array.isArray(updated.warnings) ? updated.warnings.length : 0,
          extractorVersion: 2,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      import: {
        id: updated.id,
        status: updated.status,
        sceneCount: updated.sceneCount,
        warnings: updated.warnings,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao reprocessar documento." }, { status: 400 });
  }
}
