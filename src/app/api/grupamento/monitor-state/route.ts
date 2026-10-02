import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

export async function GET(request: Request) {
  const monitorId = Number(new URL(request.url).searchParams.get("monitorId"));
  if (!isCcoMonitorId(monitorId)) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });

  const reader = await getMonitorReader(monitorId);
  if (!reader) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });

  const organizationId = reader.organizationId;
  const [configuration, current, rpn, latestPi, approvedImports, latestRevision] = await Promise.all([
    prisma.ccoMonitorConfiguration.findUnique({
      where: { organizationId_monitorId: { organizationId, monitorId } },
      select: { updatedAt: true },
    }),
    prisma.financialSourceImport.findFirst({
      where: { organizationId, sourceKind: "CURRENT" },
      orderBy: { importedAt: "desc" },
      select: { id: true, checksum: true, importedAt: true },
    }),
    prisma.financialSourceImport.findFirst({
      where: { organizationId, sourceKind: "RPNP" },
      orderBy: { importedAt: "desc" },
      select: { id: true, checksum: true, importedAt: true },
    }),
    prisma.piCatalogEntry.findFirst({
      where: { organizationId },
      orderBy: { importedAt: "desc" },
      select: { pi: true, importedAt: true, sourceChecksum: true },
    }),
    prisma.monitorContentImport.findMany({
      where: { organizationId, monitorId, status: "APPROVED" },
      orderBy: { id: "asc" },
      select: { id: true, checksum: true, sceneCount: true, approvedAt: true },
    }),
    prisma.monitorContentRevision.findFirst({
      where: { import: { organizationId, monitorId, status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
  ]);

  const stateVersion = fingerprint({
    monitorId,
    // O contrato da playlist pode mudar entre deploys sem que o banco mude.
    // Inclua a versão implantada para forçar reconstrução do snapshot local
    // quando a lógica de exibição for atualizada.
    deployment: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    configuration: configuration?.updatedAt.toISOString() ?? "default",
    current: current ? [current.id, current.checksum, current.importedAt.toISOString()] : null,
    rpn: rpn ? [rpn.id, rpn.checksum, rpn.importedAt.toISOString()] : null,
    latestPi: latestPi ? [latestPi.pi, latestPi.sourceChecksum, latestPi.importedAt.toISOString()] : null,
    approvedImports: approvedImports.map((item) => [
      item.id,
      item.checksum,
      item.sceneCount,
      item.approvedAt?.toISOString() ?? null,
    ]),
    latestRevision: latestRevision ? [latestRevision.id, latestRevision.createdAt.toISOString()] : null,
  });

  return NextResponse.json({
    stateVersion,
    deploymentVersion: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  }, {
    headers: {
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
    },
  });
}
