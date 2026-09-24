import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { extractMonitorDocument } from "@/modules/grupamento/monitor-content/extract";
import {
  assembleMonitorUpload,
  deleteMonitorUpload,
  persistMonitorContentImport,
} from "@/modules/grupamento/monitor-content/repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);
const PROCESS_TIMEOUT_MS = 45_000;

function validUploadId(value: string) {
  return /^[a-zA-Z0-9-]{12,80}$/.test(value);
}

async function withTimeout<T>(promise: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Processamento documental excedeu 45 segundos.")), PROCESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente para importar conteúdo documental." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const body = await request.json().catch(() => null) as { uploadId?: string } | null;
  const uploadId = String(body?.uploadId ?? "");
  if (!validUploadId(uploadId)) return NextResponse.json({ error: "Identificador de carga inválido." }, { status: 400 });

  try {
    const assembled = await assembleMonitorUpload({
      uploadId,
      organizationId: session.user.organizationId,
      uploadedBy: session.user.id,
    });
    const extension = assembled.fileName.toLowerCase().split(".").pop() ?? "";
    if (!["pdf", "pptx", "docx"].includes(extension)) {
      return NextResponse.json({ error: "Formato não suportado. Use PDF, PPTX ou DOCX." }, { status: 415 });
    }

    const extraction = await withTimeout(extractMonitorDocument(assembled.buffer, assembled.fileName));
    if (!extraction.scenes.length) {
      return NextResponse.json({ error: "O arquivo foi lido, mas nenhuma cena útil foi extraída. Nada foi publicado." }, { status: 422 });
    }

    const persisted = await persistMonitorContentImport({
      organizationId: session.user.organizationId,
      monitorId: assembled.monitorId,
      fileName: assembled.fileName,
      mimeType: assembled.mimeType,
      buffer: assembled.buffer,
      importedBy: session.user.id,
      extraction,
    });

    await deleteMonitorUpload(uploadId, session.user.organizationId);

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        occurredAt: new Date(),
        actorId: session.user.id,
        action: "MONITOR_CONTENT_IMPORT",
        resourceType: "MONITOR_CONTENT",
        resourceId: persisted.importRecord.id,
        organizationId: session.user.organizationId,
        requestId: randomUUID(),
        userAgent: request.headers.get("user-agent") ?? "mcl-monitor-content",
        outcome: "SUCESSO",
        reason: "Documento convertido em cenas MCL para pré-visualização; publicação ainda depende de aprovação humana.",
        metadata: {
          monitorId: assembled.monitorId,
          fileName: assembled.fileName,
          fileSize: assembled.totalSize,
          sceneCount: extraction.scenes.length,
          assetCount: extraction.assets.length,
          warningCount: extraction.warnings.length,
          deduplicated: persisted.deduplicated,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      deduplicated: persisted.deduplicated,
      import: {
        id: persisted.importRecord.id,
        fileName: persisted.importRecord.fileName,
        monitorId: persisted.importRecord.monitorId,
        status: persisted.importRecord.status,
        sceneCount: persisted.importRecord.sceneCount,
        warnings: persisted.importRecord.warnings,
        scenes: persisted.importRecord.scenes.map((scene) => ({
          id: scene.id,
          sceneOrder: scene.sceneOrder,
          sceneType: scene.sceneType,
          title: scene.title,
          sourcePage: scene.sourcePage,
          payload: scene.payload,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao processar o documento." }, { status: 400 });
  }
}
