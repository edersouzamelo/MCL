import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { editorSaveSchema, prepareEditorScene } from "./online-editor";
import {
  applyPatches,
  diffContent,
  editorPreflight,
  rebasePatches,
  type EditorContent,
  type EditorPatch,
} from "./editor-model";
import {
  EditorConflict,
  saveOnlineMonitorScenes,
} from "./online-editor-repository";
import type { MonitorDocumentSceneDto } from "./types";

type Access = {
  organizationId: string;
  monitorId: number;
  actorId: string;
  actorName: string;
};
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const contentOf = (row: unknown) => {
  const scene = prepareEditorScene(row as MonitorDocumentSceneDto);
  return { title: scene.title, elements: scene.payload.layout?.elements ?? [] };
};
export async function getEditorDrafts(input: Access) {
  const drafts = await prisma.monitorEditorDraft.findMany({
    where: {
      actorId: input.actorId,
      import: {
        organizationId: input.organizationId,
        monitorId: input.monitorId,
        status: "APPROVED",
      },
    },
  });
  return drafts.map((d) => ({
    sceneId: d.sceneId,
    revision: d.revision,
    baseRevision: d.baseRevision,
    content: applyPatches(d.base as EditorContent, d.patches as EditorPatch[]),
    updatedAt: d.updatedAt,
  }));
}
export async function saveEditorDrafts(input: Access & { value: unknown }) {
  const { scenes } = editorSaveSchema.parse(input.value);
  if (new Set(scenes.map((s) => s.id)).size !== scenes.length)
    throw new Error("Telas duplicadas.");
  return prisma.$transaction(
    async (tx) => {
      const saved = [];
      for (const edit of scenes) {
        const row = await tx.monitorContentScene.findFirst({
          where: {
            id: edit.id,
            active: true,
            import: {
              organizationId: input.organizationId,
              monitorId: input.monitorId,
              status: "APPROVED",
            },
          },
        });
        if (!row)
          throw new EditorConflict(
            "Documento não está mais publicado. Seu rascunho foi preservado.",
          );
        const draft = await tx.monitorEditorDraft.findUnique({
          where: {
            sceneId_actorId: { sceneId: row.id, actorId: input.actorId },
          },
        });
        if ((draft?.revision ?? 0) !== (edit.draftRevision ?? 0))
          throw new EditorConflict(
            "Rascunho alterado em outra aba. O trabalho local foi preservado.",
          );
        const payload = row.payload as MonitorDocumentSceneDto["payload"];
        if (!draft && (payload.onlineEditor?.revision ?? 0) !== edit.revision)
          throw new EditorConflict(
            "A publicação mudou. Recarregue ou reaplique suas alterações.",
          );
        const base =
          (draft?.base as EditorContent | undefined) ?? contentOf(row);
        const content = {
          title: edit.title,
          elements: edit.elements,
        } as EditorContent;
        const errors = editorPreflight(content).filter(
          (i) => i.severity === "error",
        );
        if (errors.length) throw new Error(errors[0].message);
        const assetIds = [
          ...new Set(
            content.elements.flatMap((e) =>
              e.kind === "image" ? [e.assetId!] : [],
            ),
          ),
        ];
        if (
          (await tx.monitorContentAsset.count({
            where: { id: { in: assetIds }, importId: row.importId },
          })) !== assetIds.length
        )
          throw new Error("Imagem não pertence ao documento.");
        const data = {
          base: json(base),
          patches: json(diffContent(base, content)),
          revision: (draft?.revision ?? 0) + 1,
          baseRevision: draft?.baseRevision ?? edit.revision,
        };
        if (draft) {
          const result = await tx.monitorEditorDraft.updateMany({
            where: { id: draft.id, revision: draft.revision },
            data,
          });
          if (result.count !== 1)
            throw new EditorConflict("Rascunho alterado durante o salvamento.");
        } else
          await tx.monitorEditorDraft.create({
            data: {
              ...data,
              sceneId: row.id,
              importId: row.importId,
              actorId: input.actorId,
            },
          });
        saved.push({ sceneId: row.id, revision: data.revision });
      }
      return saved;
    },
    { isolationLevel: "Serializable", timeout: 20000 },
  );
}
export async function publishEditorDrafts(
  input: Access & { scenes: Array<{ id: string; draftRevision: number }> },
) {
  if (
    !input.scenes.length ||
    input.scenes.length > 80 ||
    new Set(input.scenes.map((s) => s.id)).size !== input.scenes.length
  )
    throw new Error("Seleção de publicação inválida.");
  return prisma.$transaction(
    async (tx) => {
      const changes = [];
      const draftIds: string[] = [];
      for (const selected of input.scenes) {
        const draft = await tx.monitorEditorDraft.findFirst({
          where: {
            sceneId: selected.id,
            actorId: input.actorId,
            import: {
              organizationId: input.organizationId,
              monitorId: input.monitorId,
              status: "APPROVED",
            },
          },
        });
        if (!draft || draft.revision !== selected.draftRevision)
          throw new EditorConflict(
            "O rascunho mudou. Atualize antes de publicar.",
          );
        const row = await tx.monitorContentScene.findFirst({
          where: { id: draft.sceneId, active: true, importId: draft.importId },
        });
        if (!row)
          throw new EditorConflict(
            "O slide de origem mudou; o rascunho foi preservado para revisão.",
          );
        const payload = row.payload as MonitorDocumentSceneDto["payload"];
        const revision = payload.onlineEditor?.revision ?? 0;
        const rebased = rebasePatches(
          contentOf(row),
          draft.patches as EditorPatch[],
        );
        if (!rebased.content)
          throw new EditorConflict(rebased.conflicts[0].message);
        const failures = editorPreflight(rebased.content).filter(
          (i) => i.severity === "error",
        );
        if (failures.length)
          throw new Error(`Falha no preflight: ${failures[0].message}`);
        if (
          payload.inputCompiler?.preflight.status === "BLOCKED" ||
          payload.inputCompiler?.humanReview?.outcome === "NEEDS_CORRECTION"
        )
          throw new Error(
            "O compiler exige revisão deste conteúdo antes da publicação.",
          );
        await tx.monitorContentRevision.create({
          data: {
            importId: row.importId,
            sourceHash: payload.inputCompiler?.source.rawHash ?? "legacy",
            compilerVersion: payload.inputCompiler?.version ?? 0,
            actorId: input.actorId,
            kind: "EDITOR_PUBLISHED_BEFORE",
            scenes: json([row]),
          },
        });
        changes.push({ id: row.id, revision, ...rebased.content });
        draftIds.push(draft.id);
      }
      await saveOnlineMonitorScenes({
        ...input,
        value: { scenes: changes },
        transaction: tx,
      });
      await tx.monitorEditorDraft.deleteMany({
        where: { id: { in: draftIds }, actorId: input.actorId },
      });
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          occurredAt: new Date(),
          actorId: input.actorId,
          action: "MONITOR_EDITOR_PUBLISH",
          resourceType: "MONITOR_CONTENT",
          resourceId: String(input.monitorId),
          organizationId: input.organizationId,
          requestId: randomUUID(),
          userAgent: "mcl-online-editor",
          outcome: "SUCESSO",
          reason: "Publicação explícita de rascunhos",
          metadata: json({ scenes: changes.map((s) => s.id) }),
        },
      });
      return changes.length;
    },
    { isolationLevel: "Serializable", timeout: 20000 },
  );
}
export async function editorVersions(input: Access) {
  return prisma.monitorContentRevision.findMany({
    where: {
      kind: {
        in: [
          "EDITOR_PUBLISHED_BEFORE",
          "BEFORE_HUMAN_EDIT",
          "BEFORE_REPROCESS",
        ],
      },
      import: {
        organizationId: input.organizationId,
        monitorId: input.monitorId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      importId: true,
      createdAt: true,
      actorId: true,
      kind: true,
      compilerVersion: true,
    },
  });
}
