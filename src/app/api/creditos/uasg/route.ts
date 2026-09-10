import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.roles?.some(role => ["ADMIN", "LOGISTICS_MANAGER"].includes(role))) return NextResponse.json({ error: "Permissão de gestor obrigatória." }, { status: 403 });
  const id = session.user.organizationId;
  if (!id) return NextResponse.json({ error: "Organização ausente." }, { status: 422 });
  const body = await request.json().catch(() => null);
  const uasg = String(body?.uasg ?? "").trim();
  if (!/^\d{6}$/.test(uasg)) return NextResponse.json({ error: "Informe os seis dígitos da UASG." }, { status: 400 });
  try {
    // Never replace an existing binding, and never take a target organization from the request.
    const result = await prisma.organization.updateMany({
      where: { id, active: true, OR: [{ uasg: null }, { uasg }] }, data: { uasg },
    });
    if (!result.count) return NextResponse.json({ error: "Organização inativa ou já vinculada a outra UASG. O vínculo existente foi preservado." }, { status: 409 });
    return NextResponse.json({ success: true, uasg });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Essa UASG já está vinculada a outra organização." }, { status: 409 });
    return NextResponse.json({ error: "Não foi possível salvar o vínculo da UASG." }, { status: 503 });
  }
}
