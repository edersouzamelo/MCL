import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import type { MonitorDocumentScenePayload } from "@/modules/grupamento/monitor-content/types";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some(role => role === "ADMIN" || role === "LOGISTICS_MANAGER")) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  const { importId } = await params;
  const record = await prisma.monitorContentImport.findFirst({ where: { id: importId, organizationId: session.user.organizationId }, select: { id: true, checksum: true, status: true, warnings: true, scenes: { where: { active: true }, orderBy: { sceneOrder: "asc" }, select: { id: true, sourcePage: true, payload: true } } } });
  if (!record) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  const scenes = record.scenes.map(scene => ({ id: scene.id, sourcePage: scene.sourcePage, diagnostic: (scene.payload as MonitorDocumentScenePayload).inputCompiler ?? null, edited: Boolean((scene.payload as MonitorDocumentScenePayload).onlineEditor) }));
  // One source slide can produce several document pages. Count source slides once.
  const unique = [...new Map(scenes.filter(s => s.diagnostic).map(s => [`${s.diagnostic!.source.page}:${s.diagnostic!.source.slideHash}`, s])).values()];
  return NextResponse.json({ id: record.id, checksum: record.checksum, status: record.status, warnings: record.warnings, scenes, metrics: { sourceSlides: unique.length, blockedSlides: unique.filter(s => s.diagnostic?.preflight.status === "BLOCKED").length, compositionSlides: unique.filter(s => s.diagnostic?.strategy === "PRESERVE_COMPOSITION").length, llmCalls: 0, editedScenes: scenes.filter(s => s.edited).length, confidenceMean: unique.length ? unique.reduce((sum, s) => sum + s.diagnostic!.confidence, 0) / unique.length : null } }, { headers: { "Cache-Control": "private, no-store" } });
}
