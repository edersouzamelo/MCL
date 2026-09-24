import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getMonitorContentSource } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  const { importId } = await params;
  const source = await getMonitorContentSource(importId, session.user.organizationId);
  if (!source) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  return new Response(new Uint8Array(source.rawFile), {
    headers: {
      "Content-Type": source.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${source.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
