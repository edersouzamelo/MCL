import { NextResponse } from "next/server";
import { editorAccess } from "@/modules/grupamento/monitor-content/editor-access";
import { getApprovedMonitorScenes } from "@/modules/grupamento/monitor-content/repository";
import { saveOnlineMonitorScenes, EditorConflict } from "@/modules/grupamento/monitor-content/online-editor-repository";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ monitorId: string }> }) {
  const access = await editorAccess((await params).monitorId);
  if (access.error) return access.error;
  return NextResponse.json({ scenes: await getApprovedMonitorScenes(access.user.organizationId!, access.monitorId) }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request, { params }: { params: Promise<{ monitorId: string }> }) {
  const access = await editorAccess((await params).monitorId);
  if (access.error) return access.error;
  if (Number(request.headers.get("content-length")) > 3_000_000) return NextResponse.json({ error: "Edição muito grande. Salve menos telas de cada vez." }, { status: 413 });
  try {
    const text = await request.text();
    if (text.length > 3_000_000) return NextResponse.json({ error: "Edição muito grande." }, { status: 413 });
    await saveOnlineMonitorScenes({ organizationId: access.user.organizationId!, monitorId: access.monitorId, actorId: access.user.id, actorName: access.user.name ?? access.user.email ?? access.user.id, value: JSON.parse(text) });
    return NextResponse.json({ scenes: await getApprovedMonitorScenes(access.user.organizationId!, access.monitorId) });
  } catch (error) {
    const conflict = error instanceof EditorConflict || (error && typeof error === "object" && "code" in error && error.code === "P2034");
    return NextResponse.json({ error: conflict ? (error instanceof EditorConflict ? error.message : "Outra edição foi salva ao mesmo tempo. Recarregue o editor.") : error instanceof Error && error.name !== "ZodError" ? error.message : "Revise os campos e tamanhos da edição." }, { status: conflict ? 409 : 400 });
  }
}
