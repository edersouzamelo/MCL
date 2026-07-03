import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { searchArpsForConfirmedCatmat } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const state = getDemoState();
    const result = await searchArpsForConfirmedCatmat(state, await request.json(), {
      actorId: session.user.id,
      organizationId: session.user.organizationId,
      userAgent: request.headers.get("user-agent") ?? "mcl-web",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao consultar atas." },
      { status: 400 },
    );
  }
}
