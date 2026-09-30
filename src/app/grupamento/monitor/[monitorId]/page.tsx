import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GrupamentoMonitorClient } from "@/components/GrupamentoMonitorClient";
import { authOptions } from "@/modules/auth/options";
import { getDisplayDevice, getMonitorReader } from "@/modules/grupamento/monitor-device";

export const dynamic = "force-dynamic";

export default async function GrupamentoMonitorPage({ params, searchParams }: { params: Promise<{ monitorId: string }>; searchParams: Promise<{ capture?: string; frame?: string }> }) {
  const { monitorId: monitorIdParam } = await params;
  const query = await searchParams;
  const captureMode = query.capture === "1";
  const requestedFrame = Number(query.frame ?? "0");
  const initialCaptureFrame = Number.isInteger(requestedFrame) && requestedFrame >= 0 ? requestedFrame : 0;
  const monitorId = Number(monitorIdParam);
  if (!isCcoMonitorId(monitorId)) notFound();
  const reader = await getMonitorReader(monitorId);
  if (!reader) redirect("/entrar");
  const session = await getServerSession(authOptions);
  const paired = await getDisplayDevice();
  const canEnroll = Boolean(session?.user?.id && (session.user.roles ?? []).some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER") && paired?.monitorId !== monitorId);

  return <GrupamentoMonitorClient monitorId={monitorId} organizationId={reader.organizationId} canEnroll={canEnroll} buildVersion={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"} captureMode={captureMode} initialCaptureFrame={initialCaptureFrame} />;
}
