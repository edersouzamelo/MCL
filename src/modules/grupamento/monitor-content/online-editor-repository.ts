import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { editorSaveSchema, prepareEditorScene, chartWithoutColors } from "./online-editor";
import { diffContent } from "./editor-model";
import type { MonitorDocumentSceneDto } from "./types";
import type { MonitorDocumentScenePayload, MonitorSlideElement } from "./types";

export class EditorConflict extends Error {}
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function saveOnlineMonitorScenes(input: { organizationId: string; monitorId: number; actorId: string; actorName: string; value: unknown; transaction?: Prisma.TransactionClient }) {
  const { scenes } = editorSaveSchema.parse(input.value);
  if (new Set(scenes.map(scene => scene.id)).size !== scenes.length) throw new Error("Há telas duplicadas na solicitação.");
  const execute = async (tx: Prisma.TransactionClient) => {
    for (const edit of scenes) {
      const row = await tx.monitorContentScene.findFirst({ where: { id: edit.id, active: true, import: { organizationId: input.organizationId, monitorId: input.monitorId, status: "APPROVED" } } });
      if (!row) throw new EditorConflict("O documento deixou de estar publicado. Recarregue o editor.");
      const old = row.payload as MonitorDocumentScenePayload;
      if ((old.onlineEditor?.revision ?? 0) !== edit.revision) throw new EditorConflict("Outra pessoa atualizou esta tela. Recarregue antes de editar novamente.");
      const assetIds = [...new Set(edit.elements.flatMap(item => item.kind === "image" ? [item.assetId] : []))];
      const assets = await tx.monitorContentAsset.count({ where: { id: { in: assetIds }, importId: row.importId } });
      if (assets !== assetIds.length) throw new Error("Imagem não pertence a este documento.");
      const originalCharts = (old.layout?.elements ?? []).flatMap(item => item.kind === "chart" ? [item.chart] : []);
      for (const item of edit.elements) if (item.kind === "chart" && !originalCharts.some(original => JSON.stringify(chartWithoutColors(original)) === JSON.stringify(chartWithoutColors(item.chart)))) throw new Error("O editor altera as cores dos gráficos, preservando seus dados. Importe outro arquivo para substituir os valores.");
      const elements = structuredClone(edit.elements) as MonitorSlideElement[];
      const compiledBase = old.onlineEditor?.compiledBase ?? { title: row.title, elements: prepareEditorScene({ ...row, payload: old } as unknown as MonitorDocumentSceneDto).payload.layout?.elements ?? [] };
      if (old.inputCompiler) await tx.monitorContentRevision.create({ data: { importId: row.importId, sourceHash: old.inputCompiler.source.rawHash, compilerVersion: old.inputCompiler.version, actorId: input.actorId, kind: "BEFORE_HUMAN_EDIT", scenes: [JSON.parse(JSON.stringify(row))] } });
      const payload: MonitorDocumentScenePayload = { ...old, layoutVersion: 2, layout: { version: 2, width: old.layout?.width ?? 12192000, height: old.layout?.height ?? 6858000, elements }, assetIds, onlineEditor: { version: 1, revision: edit.revision + 1, updatedAt: new Date().toISOString(), updatedByName: input.actorName, compiledBase, overrides: diffContent(compiledBase, { title: edit.title, elements }) } };
      const result = await tx.monitorContentScene.updateMany({ where: { id: row.id, payload: { equals: row.payload as Prisma.InputJsonValue }, title: row.title, active: true }, data: { title: edit.title, payload: json(payload) } });
      if (result.count !== 1) throw new EditorConflict("A apresentação foi alterada durante o salvamento. Recarregue o editor.");
      await tx.auditLog.create({ data: { id: randomUUID(), occurredAt: new Date(), actorId: input.actorId, action: "MONITOR_CONTENT_ONLINE_EDIT", resourceType: "MONITOR_CONTENT", resourceId: row.importId, organizationId: input.organizationId, requestId: randomUUID(), userAgent: "mcl-online-editor", outcome: "SUCESSO", reason: "Conteúdo documental ajustado no editor online; arquivo original preservado.", metadata: json({ monitorId: input.monitorId, sceneId: row.id, actorName: input.actorName, before: { title: row.title, revision: old.onlineEditor?.revision ?? 0, sha256: createHash("sha256").update(JSON.stringify(row.payload)).digest("hex") }, after: { title: edit.title, revision: payload.onlineEditor!.revision, elementCount: elements.length, sha256: createHash("sha256").update(JSON.stringify(payload)).digest("hex") } }) } });
    }
    return scenes.length;
  };
  return input.transaction ? execute(input.transaction) : prisma.$transaction(execute, { isolationLevel: "Serializable", timeout: 20000 });
}
