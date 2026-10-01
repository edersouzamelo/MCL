import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { isCcoMonitorId } from "@/modules/grupamento/monitor";
import { MonitorOnlineEditor } from "@/components/MonitorOnlineEditor";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ monitorId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/entrar");
  if (!(session.user.roles ?? []).some(role => role === "ADMIN" || role === "LOGISTICS_MANAGER")) return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-xl font-bold">Edição restrita a gestores</h1><p>Sua conta permite consultar o painel. Um administrador ou gestor logístico pode editar os documentos publicados.</p><a href="/grupamento" className="underline">Voltar ao painel</a></main>;
  const id = Number((await params).monitorId);
  if (!isCcoMonitorId(id)) notFound();
  return <MonitorOnlineEditor monitorId={id} currentUserName={session.user.name ?? session.user.email ?? session.user.id} />;
}
