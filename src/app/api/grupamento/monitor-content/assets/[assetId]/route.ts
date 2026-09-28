import { NextResponse } from "next/server";
import { getMonitorReader } from "@/modules/grupamento/monitor-device";
import { getMonitorContentAsset } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const reader = await getMonitorReader();
  if (!reader) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  const { assetId } = await params;
  const asset = await getMonitorContentAsset(assetId, reader.organizationId, reader.monitorId ?? undefined);
  if (!asset) return NextResponse.json({ error: "Figura não encontrada." }, { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
