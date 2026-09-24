import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getApprovedMonitorScenes } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const monitorId = Number(new URL(request.url).searchParams.get("monitorId"));
  if (!Number.isInteger(monitorId) || monitorId < 1 || monitorId > 8) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });

  const scenes = await getApprovedMonitorScenes(session.user.organizationId, monitorId);
  return NextResponse.json({ scenes });
}
