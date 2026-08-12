import { NextResponse } from "next/server";
import { getRouteActor } from "@/modules/auth/route-actor";
import { canManageCatmat } from "@/modules/auth/authorization";
import { revokeCatalogMapping } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getRouteActor();
  if (!actor) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }
  if (!canManageCatmat(actor.roles)) {
    return NextResponse.json({ error: "Permissao insuficiente para revogar CATMAT." }, { status: 403 });
  }

  try {
    const state = getDemoState();
    const mapping = await revokeCatalogMapping(
      state,
      await request.json(),
      actor.roles,
      actor.id,
      actor.organizationId,
    );
    return NextResponse.json({ mapping });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao revogar CATMAT." },
      { status: 400 },
    );
  }
}
