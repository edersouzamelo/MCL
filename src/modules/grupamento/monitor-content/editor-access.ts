import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { isCcoMonitorId } from "@/modules/grupamento/monitor";
export async function editorAccess(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 }) };
  if (!(session.user.roles ?? []).some(role => role === "ADMIN" || role === "LOGISTICS_MANAGER")) return { error: NextResponse.json({ error: "Permissão insuficiente para editar documentos." }, { status: 403 }) };
  if (!session.user.organizationId) return { error: NextResponse.json({ error: "Sessão sem organização." }, { status: 422 }) };
  const monitorId = Number(id);
  if (!isCcoMonitorId(monitorId)) return { error: NextResponse.json({ error: "Monitor inválido." }, { status: 400 }) };
  return { user: session.user, monitorId };
}
