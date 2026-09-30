import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GrupamentoMonitorClient } from "@/components/GrupamentoMonitorClient";
import { authOptions } from "@/modules/auth/options";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";

export const dynamic = "force-dynamic";

export default async function GrupamentoMonitorCapturePage({ params }: { params: Promise<{ monitorId: string }> }) {
  const { monitorId: monitorIdParam } = await params;
  const monitorId = Number(monitorIdParam);
  if (!isCcoMonitorId(monitorId)) notFound();

  const reader = await getMonitorReader(monitorId);
  if (!reader) redirect("/entrar");

  const session = await getServerSession(authOptions);
  const canRead = Boolean(session?.user?.id || reader.device);
  if (!canRead) redirect("/entrar");

  return (
    <GrupamentoMonitorClient
      monitorId={monitorId}
      organizationId={reader.organizationId}
      canEnroll={false}
      buildVersion={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
      captureMode
      initialCaptureFrame={0}
    />
  );
}
