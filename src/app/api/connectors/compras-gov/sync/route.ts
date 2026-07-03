import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Role } from "@/modules/domain/types";
import { authOptions } from "@/modules/auth/options";
import { runComprasGovSync } from "@/modules/connectors/compras-gov/sync";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

function canSync(roles: string[] = []) {
  return roles.includes("ADMIN") || roles.includes("LOGISTICS_MANAGER");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const roles = (session.user.roles ?? []) as Role[];
  if (!canSync(roles)) {
    return NextResponse.json({ error: "Permissao insuficiente para sincronizar o conector." }, { status: 403 });
  }

  try {
    const state = getDemoState();
    const run = await runComprasGovSync(state, {
      actorId: session.user.id,
      organizationId: session.user.organizationId,
      userAgent: request.headers.get("user-agent") ?? "mcl-web",
    });
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao sincronizar Compras.gov.br." },
      { status: 409 },
    );
  }
}
