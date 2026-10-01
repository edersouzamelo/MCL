import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { compilationMetrics } from "@/modules/grupamento/monitor-content/compiler/pipeline";
import type { MonitorDocumentScenePayload } from "@/modules/grupamento/monitor-content/types";

export const runtime = "nodejs";
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.roles?.some(role => ["ADMIN", "LOGISTICS_MANAGER"].includes(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  // Bounded, explicit sample; a PASS without review is not counted as correct.
  const imports = await prisma.monitorContentImport.findMany({ where: { organizationId: session.user.organizationId, status: { not: "ARCHIVED" } }, orderBy: { importedAt: "desc" }, take: 100, select: { id: true, scenes: { select: { payload: true } } } });
  const payloads = imports.flatMap(record => record.scenes.map(scene => scene.payload as MonitorDocumentScenePayload));
  const verified = imports.filter(record => record.scenes.length && record.scenes.every(scene => (scene.payload as MonitorDocumentScenePayload).inputCompiler?.humanReview));
  const correct = verified.filter(record => record.scenes.every(scene => { const payload = scene.payload as MonitorDocumentScenePayload; return payload.inputCompiler?.humanReview?.outcome === "CORRECT" && !payload.onlineEditor; }));
  return NextResponse.json({ sampleLimit: 100, sampledImports: imports.length, metrics: compilationMetrics(payloads.map(payload => payload.inputCompiler)), manuallyEditedSlides: payloads.filter(payload => payload.onlineEditor).length,
    verifiedImports: verified.length, importedCorrectlyWithoutManualCorrectionPercent: verified.length ? correct.length / verified.length * 100 : null }, { headers: { "Cache-Control": "private, no-store" } });
}
