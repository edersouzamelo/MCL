import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AppShell } from "@/components/AppShell";
import { GrupamentoCommandCenterClient } from "@/components/GrupamentoCommandCenterClient";
import { GrupamentoStorageBridge } from "@/components/GrupamentoStorageBridge";
import { authOptions } from "@/modules/auth/options";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"]);

export default async function GrupamentoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/entrar");

  const roles = (session.user.roles ?? []) as string[];
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) redirect("/inicio");

  return (
    <AppShell>
      <GrupamentoStorageBridge />
      <div className="space-y-6">
        <GrupamentoCommandCenterClient organizationId={session.user.organizationId} />
      </div>
    </AppShell>
  );
}
