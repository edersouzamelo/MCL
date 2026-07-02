import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DemoState, EventType, LogisticsEvent, Role } from "@/modules/domain/types";
import { projectLogisticsUnit } from "@/modules/events/projection";

export const allowedCaptureEvents: EventType[] = [
  "MATERIAL_RECEBIDO",
  "INSPECAO_CONCLUIDA",
  "MATERIAL_ARMAZENADO",
  "ESTOQUE_RESERVADO",
  "MATERIAL_SEPARADO",
  "REMESSA_EXPEDIDA",
  "MATERIAL_EM_TRANSITO",
  "MATERIAL_ENTREGUE",
  "DIVERGENCIA_REGISTRADA",
  "EVENTO_CORRIGIDO",
];

export const logisticsEventInputSchema = z.object({
  eventType: z.enum(allowedCaptureEvents),
  logisticsUnitId: z.string().min(1),
  quantity: z.coerce.number().positive().max(100000),
  unit: z.string().min(1).max(30),
  locationId: z.string().min(1),
  condition: z.string().min(1).max(80),
  note: z.string().max(600).optional().default(""),
  idempotencyKey: z.string().min(12).max(120),
  actorId: z.string().min(1).default("user-demo-admin"),
  criticalConfirmation: z.coerce.boolean().optional().default(false),
});

export type LogisticsEventInput = z.infer<typeof logisticsEventInputSchema>;

export function assertCanCaptureEvent(roles: Role[]) {
  if (roles.some((role) => ["ADMIN", "LOGISTICS_MANAGER", "WAREHOUSE_OPERATOR"].includes(role))) {
    return;
  }

  throw new Error("Perfil sem permissao para registrar evento logistico.");
}

export function createLogisticsEvent(
  state: DemoState,
  rawInput: unknown,
  roles: Role[] = ["ADMIN"],
) {
  assertCanCaptureEvent(roles);
  const input = logisticsEventInputSchema.parse(rawInput);
  const duplicate = state.events.find((event) => event.idempotencyKey === input.idempotencyKey);

  if (duplicate) {
    return {
      event: duplicate,
      duplicate: true,
      projection: projectLogisticsUnit(
        state.logisticsUnits.find((unit) => unit.id === input.logisticsUnitId)!,
        state.events,
      ),
    };
  }

  const logisticsUnit = state.logisticsUnits.find((unit) => unit.id === input.logisticsUnitId);
  if (!logisticsUnit) {
    throw new Error("Unidade logistica nao encontrada.");
  }

  const criticalEvents: EventType[] = ["DIVERGENCIA_REGISTRADA", "EVENTO_CORRIGIDO", "MATERIAL_ENTREGUE"];
  if (criticalEvents.includes(input.eventType) && !input.criticalConfirmation) {
    throw new Error("Evento critico requer confirmacao adicional.");
  }

  const now = new Date().toISOString();
  const event: LogisticsEvent = {
    id: randomUUID(),
    persistentCode: `MCL-EVT-${new Date().getUTCFullYear()}-${String(state.events.length + 1).padStart(4, "0")}`,
    eventType: input.eventType,
    occurredAt: now,
    recordedAt: now,
    objectType: "LOGISTICS_UNIT",
    objectId: logisticsUnit.id,
    quantity: input.quantity,
    unit: input.unit,
    locationId: input.locationId,
    condition: input.condition,
    sourceSystem: "MCL-DEMO-CAPTURE",
    sourceRecordId: input.idempotencyKey,
    actorId: input.actorId,
    idempotencyKey: input.idempotencyKey,
    schemaVersion: "mcl.v0.1",
    authorityLevel: "DEMONSTRATIVO",
    confidence: input.eventType === "DIVERGENCIA_REGISTRADA" ? 0.72 : 0.88,
    dataNature: input.eventType === "DIVERGENCIA_REGISTRADA" ? "divergente" : "informado",
    payload: {
      note: input.note,
      capturedBy: "event-capture-form",
      synthetic: true,
    },
    createdAt: now,
  };

  state.events.push(event);
  const projection = projectLogisticsUnit(logisticsUnit, state.events);

  logisticsUnit.currentState = projection.state;
  logisticsUnit.currentLocationId = projection.locationId;
  logisticsUnit.condition = projection.condition;
  logisticsUnit.confidence = projection.confidence;
  logisticsUnit.sourceEventId = event.id;
  logisticsUnit.updatedAt = now;
  logisticsUnit.dataNature = input.eventType === "DIVERGENCIA_REGISTRADA" ? "divergente" : "calculado";
  logisticsUnit.recordedAt = now;

  if (input.eventType === "DIVERGENCIA_REGISTRADA") {
    state.divergences.push({
      id: randomUUID(),
      persistentCode: `MCL-DIV-${new Date().getUTCFullYear()}-${String(state.divergences.length + 1).padStart(4, "0")}`,
      title: input.note || "Divergencia registrada por operador",
      severity: "ALTA",
      status: "ABERTA",
      objectType: "LOGISTICS_UNIT",
      objectId: logisticsUnit.id,
      expected: `${input.quantity} ${input.unit} conformes`,
      observed: input.condition,
      sourceSystem: event.sourceSystem,
      sourceRecordId: event.sourceRecordId,
      confidence: event.confidence,
      detectedAt: now,
    });
  }

  return { event, duplicate: false, projection };
}
