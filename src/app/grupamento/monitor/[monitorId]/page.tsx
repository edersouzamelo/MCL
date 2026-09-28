import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GrupamentoMonitorClient } from "@/components/GrupamentoMonitorClient";
import { authOptions } from "@/modules/auth/options";
import { getDisplayDevice, getMonitorReader } from "@/modules/grupamento/monitor-device";

export const dynamic = "force-dynamic";

export default async function GrupamentoMonitorPage({ params }: { params: Promise<{ monitorId: string }> }) {
  const { monitorId: monitorIdParam } = await params;
  const monitorId = Number(monitorIdParam);
  if (!Number.isInteger(monitorId) || monitorId < 1 || monitorId > 8) notFound();
  const reader = await getMonitorReader(monitorId);
  if (!reader) redirect("/entrar");
  const session = await getServerSession(authOptions);
  const paired = await getDisplayDevice();
  const canEnroll = Boolean(session?.user?.id && (session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER") && paired?.monitorId !== monitorId);

  return <GrupamentoMonitorClient monitorId={monitorId} organizationId={reader.organizationId} canEnroll={canEnroll} buildVersion={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"} />;
}
