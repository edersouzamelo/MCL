import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getMonitorContentAsset } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  const { assetId } = await params;
  const asset = await getMonitorContentAsset(assetId, session.user.organizationId);
  if (!asset) return NextResponse.json({ error: "Figura não encontrada." }, { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
