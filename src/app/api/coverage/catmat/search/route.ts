import { NextResponse } from "next/server";
import { getRouteActor } from "@/modules/auth/route-actor";
import { searchOfficialCatmatCandidates } from "@/modules/coverage/catmat-official-search";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getRouteActor();
  if (!actor) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const state = getDemoState();
    const result = await searchOfficialCatmatCandidates(state, await request.json(), {
      actorId: actor.id,
      organizationId: actor.organizationId,
      userAgent: request.headers.get("user-agent") ?? "mcl-web",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao pesquisar CATMAT oficial." },
      { status: 400 },
    );
  }
}
