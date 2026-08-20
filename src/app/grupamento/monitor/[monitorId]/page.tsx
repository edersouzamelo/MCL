import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GrupamentoMonitorClient } from "@/components/GrupamentoMonitorClient";
import { authOptions } from "@/modules/auth/options";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"]);

export default async function GrupamentoMonitorPage({ params }: { params: Promise<{ monitorId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/entrar");

  const roles = (session.user.roles ?? []) as string[];
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) redirect("/inicio");

  const { monitorId: monitorIdParam } = await params;
  const monitorId = Number(monitorIdParam);
  if (!Number.isInteger(monitorId) || monitorId < 1 || monitorId > 8) notFound();

  return <GrupamentoMonitorClient monitorId={monitorId} />;
}
