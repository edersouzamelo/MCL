import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { appendAuditLog } from "@/server/demo-store";

export type AuditEntryInput = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId?: string | null;
  outcome: string;
  reason: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  sourceIpHash?: string | null;
};

export async function recordAuditEvent(entry: AuditEntryInput) {
  const id = randomUUID();
  const occurredAt = new Date();
  const requestId = randomUUID();
  const userAgent = entry.userAgent ?? "mcl-auth";

  if (process.env.DATABASE_URL) {
    try {
      return await prisma.auditLog.create({
        data: {
          id,
          occurredAt,
          actorId: entry.actorId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          organizationId: entry.organizationId ?? null,
          requestId,
          sourceIpHash: entry.sourceIpHash ?? null,
          userAgent,
          outcome: entry.outcome,
          reason: entry.reason,
          metadata: entry.metadata ?? {},
        },
      });
    } catch (error) {
      console.error("MCL: falha ao persistir evento de auditoria; registrando apenas no fallback de demonstração.", error);
    }
  }

  return appendAuditLog({
    actorId: entry.actorId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    organizationId: entry.organizationId ?? undefined,
    outcome: entry.outcome,
    reason: entry.reason,
    metadata: entry.metadata ?? {},
    requestId,
    userAgent,
  });
}
