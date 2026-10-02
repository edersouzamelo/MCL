import { NextResponse } from "next/server";
import { z } from "zod";
import { editorAccess } from "@/modules/grupamento/monitor-content/editor-access";
import { getApprovedMonitorScenes } from "@/modules/grupamento/monitor-content/repository";
import { EditorConflict } from "@/modules/grupamento/monitor-content/online-editor-repository";
import {
  getEditorDrafts,
  saveEditorDrafts,
  publishEditorDrafts,
  editorVersions,
} from "@/modules/grupamento/monitor-content/editor-draft-repository";

export const runtime = "nodejs";
type Context = { params: Promise<{ monitorId: string }> };
async function accessFor(context: Context) {
  const access = await editorAccess((await context.params).monitorId);
  if (access.error) return { error: access.error };
  return {
    input: {
      organizationId: access.user.organizationId!,
      monitorId: access.monitorId,
      actorId: access.user.id,
      actorName: access.user.name ?? access.user.email ?? access.user.id,
    },
  };
}
export async function GET(_request: Request, context: Context) {
  const access = await accessFor(context);
  if (access.error) return access.error;
  const input = access.input!;
  const [scenes, drafts, versions] = await Promise.all([
    getApprovedMonitorScenes(input.organizationId, input.monitorId),
    getEditorDrafts(input),
    editorVersions(input),
  ]);
  return NextResponse.json(
    { scenes, drafts, versions },
    { headers: { "Cache-Control": "no-store" } },
  );
}
async function write(request: Request, context: Context, publish: boolean) {
  const access = await accessFor(context);
  if (access.error) return access.error;
  if (Number(request.headers.get("content-length")) > 3_000_000)
    return NextResponse.json(
      { error: "Edição muito grande." },
      { status: 413 },
    );
  try {
    const text = await request.text();
    if (text.length > 3_000_000)
      return NextResponse.json(
        { error: "Edição muito grande." },
        { status: 413 },
      );
    const value = JSON.parse(text),
      input = access.input!;
    if (!publish)
      return NextResponse.json({
        saved: await saveEditorDrafts({ ...input, value }),
      });
    const selection = z
      .object({
        scenes: z
          .array(
            z.object({
              id: z.string().uuid(),
              draftRevision: z.number().int().positive(),
            }),
          )
          .min(1)
          .max(80),
      })
      .parse(value);
    await publishEditorDrafts({ ...input, scenes: selection.scenes });
    return NextResponse.json({
      scenes: await getApprovedMonitorScenes(
        input.organizationId,
        input.monitorId,
      ),
    });
  } catch (error) {
    const conflict =
      error instanceof EditorConflict ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        ["P2034", "P2002"].includes(String(error.code)));
    return NextResponse.json(
      {
        error: conflict
          ? error instanceof EditorConflict
            ? error.message
            : "Edição concorrente. Seu trabalho foi preservado."
          : error instanceof Error && error.name !== "ZodError"
            ? error.message
            : "Revise os campos da edição.",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
/** Saving is always draft-only. Publication requires the separate POST action. */
export const PUT = (request: Request, context: Context) =>
  write(request, context, false);
export const POST = (request: Request, context: Context) =>
  write(request, context, true);
