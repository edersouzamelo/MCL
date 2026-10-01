import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { MonitorDocumentScenePayload } from "@/modules/grupamento/monitor-content/types";
import { COMPILER_VERSION } from "@/modules/grupamento/monitor-content/compiler/contracts";

const schema = z.object({ sceneId: z.string().uuid(), outcome: z.enum(["CORRECT", "NEEDS_CORRECTION"]), archetype: z.enum(["COVER", "CHART_CENTRIC", "TABLE_CENTRIC", "DOCUMENT_LIKE", "IMAGE_FULLFRAME", "TEXT_CENTRIC", "MIXED", "UNKNOWN"]).optional() });
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.roles?.some(role => ["ADMIN", "LOGISTICS_MANAGER"].includes(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Revisão inválida." }, { status: 400 });
  const user = session.user;
  const { importId } = await params;
  try {
    await prisma.$transaction(async tx => {
      const scene = await tx.monitorContentScene.findFirst({ where: { id: value.data.sceneId, importId, import: { organizationId: user.organizationId } }, include: { import: { select: { checksum: true } } } });
      if (!scene) throw new Error("Tela não encontrada.");
      const payload = structuredClone(scene.payload) as MonitorDocumentScenePayload;
      if (!payload.inputCompiler) throw new Error("Tela anterior ao compilador. Reprocesse o original para revisar a interpretação.");
      if (value.data.outcome === "CORRECT" && payload.inputCompiler.preflight.status === "BLOCKED") throw new Error("Confirmação humana não libera perdas detectadas pelo preflight.");
      await tx.monitorContentRevision.create({ data: { importId, sourceHash: scene.import.checksum, compilerVersion: COMPILER_VERSION, actorId: user.id, kind: "BEFORE_REVIEW", scenes: [JSON.parse(JSON.stringify(scene))] } });
      payload.inputCompiler.humanReview = { outcome: value.data.outcome, at: new Date().toISOString(), actorId: user.id };
      if (value.data.archetype) payload.inputCompiler.interpretedContent.archetype = value.data.archetype;
      if (value.data.outcome === "NEEDS_CORRECTION") payload.inputCompiler.preflight.status = "BLOCKED";
      const updated = await tx.monitorContentScene.updateMany({ where: { id: scene.id, payload: { equals: scene.payload as Prisma.InputJsonValue } }, data: { payload: JSON.parse(JSON.stringify(payload)) } });
      if (updated.count !== 1) throw new Error("A tela mudou durante a revisão. Atualize a prévia.");
      await tx.auditLog.create({ data: { id: randomUUID(), occurredAt: new Date(), actorId: user.id, organizationId: user.organizationId, requestId: randomUUID(), resourceType: "MONITOR_CONTENT", resourceId: importId, action: "MONITOR_COMPILER_REVIEW", outcome: "SUCESSO", userAgent: "mcl-exception-desk", reason: "Revisão humana da interpretação, sem alteração do original.", metadata: value.data } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na revisão." }, { status: 409 }); }
}
