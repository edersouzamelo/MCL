import { CCO_MONITOR_COUNT, CCO_TEST_MONITOR_ID } from "@/modules/grupamento/monitor";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { listCcoMonitorConfigs } from "@/modules/grupamento/monitor-config-repository";
import { getApprovedMonitorScenes, getMonitorContentAsset } from "@/modules/grupamento/monitor-content/repository";
import { getLatestFinancialSnapshotPair } from "@/modules/financial-snapshots/repository";
import { buildBriefingPowerPoint } from "@/modules/grupamento/briefing-export";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!(session.user.roles ?? []).some((role) => ["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"].includes(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  const organizationId = session.user.organizationId;
  if (!organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });
  try {
    const [monitors, pair, scenePairs] = await Promise.all([
      listCcoMonitorConfigs(organizationId), getLatestFinancialSnapshotPair(organizationId),
      Promise.all(Array.from({ length: CCO_MONITOR_COUNT }, async (_, i) => [i + 1, await getApprovedMonitorScenes(organizationId, i + 1)] as const)),
    ]);
    const result = await buildBriefingPowerPoint({ monitors: monitors.filter(m => m.id !== CCO_TEST_MONITOR_ID && (m.id <= 8 || m.enabled)), sag: pair.current, rpn: pair.rpn, scenes: Object.fromEntries(scenePairs), loadAsset: (id, monitorId) => getMonitorContentAsset(id, organizationId, monitorId) });
    await prisma.auditLog.create({ data: {
      id: randomUUID(), occurredAt: new Date(), actorId: session.user.id, organizationId,
      action: "CCOL_BRIEFING_EXPORT", resourceType: "CCOL_MONITORS", resourceId: organizationId,
      requestId: randomUUID(), userAgent: request.headers.get("user-agent") ?? "mcl-briefing", outcome: "SUCESSO", reason: "Briefing exportado no modelo institucional com conteúdo publicado.",
      metadata: { slideCount: result.slideCount, monitorIds: monitors.map((m) => m.id), sceneIds: scenePairs.flatMap(([, scenes]) => scenes.map((s) => s.id)) },
    } });
    return new Response(new Uint8Array(result.buffer), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Briefing-Logistico-${new Date().toISOString().slice(0, 10)}.pptx"`,
      "Cache-Control": "no-store",
    } });
  } catch (cause) {
    console.error("CCOL briefing export", cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Falha ao gerar o briefing." }, { status: 422 });
  }
}
