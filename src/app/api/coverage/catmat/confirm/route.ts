import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Role } from "@/modules/domain/types";
import { authOptions } from "@/modules/auth/options";
import { confirmCatalogMapping } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const state = getDemoState();
    const mapping = await confirmCatalogMapping(
      state,
      await request.json(),
      (session.user.roles ?? []) as Role[],
      session.user.id,
      session.user.organizationId,
    );
    return NextResponse.json({ mapping });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao confirmar CATMAT." },
      { status: 400 },
    );
  }
}
