import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { compilationMetrics } from "@/modules/grupamento/monitor-content/compiler/pipeline";
import type { MonitorDocumentScenePayload } from "@/modules/grupamento/monitor-content/types";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.roles?.some(role => ["ADMIN", "LOGISTICS_MANAGER"].includes(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  const { importId } = await params;
  const source = await prisma.monitorContentImport.findFirst({ where: { id: importId, organizationId: session.user.organizationId }, select: { id: true, checksum: true, scenes: { orderBy: { sceneOrder: "asc" } }, revisions: { orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, kind: true, compilerVersion: true }, take: 30 } } });
  if (!source) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  const diagnostics = source.scenes.map(scene => ({ sceneId: scene.id, title: scene.title, diagnostic: (scene.payload as MonitorDocumentScenePayload).inputCompiler }));
  return NextResponse.json({ checksum: source.checksum, metrics: compilationMetrics(diagnostics.map(scene => scene.diagnostic)), scenes: diagnostics, revisions: source.revisions }, { headers: { "Cache-Control": "private, no-store" } });
}
