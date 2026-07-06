import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getDemoState } from "@/server/demo-store";
import { getDiagnosticData } from "@/modules/connectors/catalog";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const state = getDemoState();
    const diagnosis = getDiagnosticData(state);
    return NextResponse.json(diagnosis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao obter diagnóstico de conectores." },
      { status: 500 }
    );
  }
}
