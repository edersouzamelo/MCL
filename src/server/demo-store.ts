import { randomUUID } from "node:crypto";
import { createDemoState } from "@/modules/demo/data";
import type { AuditLog, DemoState } from "@/modules/domain/types";

const globalForDemo = globalThis as unknown as {
  mclDemoState?: DemoState;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getDemoState(): DemoState {
  if (!globalForDemo.mclDemoState) {
    globalForDemo.mclDemoState = clone(createDemoState());
  }

  return globalForDemo.mclDemoState;
}

export function resetDemoState() {
  globalForDemo.mclDemoState = clone(createDemoState());
  return globalForDemo.mclDemoState;
}

export function findUnitByQrToken(token: string) {
  const state = getDemoState();
  return state.logisticsUnits.find((unit) => unit.qrToken === token || `MCL:UL:${unit.qrToken}` === token);
}

export function appendAuditLog(entry: Omit<AuditLog, "id" | "occurredAt" | "requestId" | "userAgent"> & Partial<Pick<AuditLog, "requestId" | "userAgent">>) {
  const state = getDemoState();
  const log: AuditLog = {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    requestId: entry.requestId ?? randomUUID(),
    userAgent: entry.userAgent ?? "mcl-demo",
    ...entry,
  };
  state.auditLogs.unshift(log);
  return log;
}

export function resolveQrInput(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("Informe um QR Code ou token.");
  }

  if (value.startsWith("MCL:UL:")) {
    return value.replace("MCL:UL:", "");
  }

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const token = parts.at(-1);
    if (token && (parts.includes("unidades") || parts.includes("etiquetas"))) {
      return token;
    }
  } catch {
    // Valor manual simples continua permitido.
  }

  if (/^ul-[a-z0-9-]+$/i.test(value)) {
    return value;
  }

  throw new Error("Formato rejeitado: apenas MCL:UL:<token> ou URL controlada do piloto.");
}
