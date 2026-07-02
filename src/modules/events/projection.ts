import type {
  DemoState,
  EventType,
  LogisticsEvent,
  LogisticsUnit,
  LogisticsUnitState,
  Need,
} from "@/modules/domain/types";

const stateByEvent: Partial<Record<EventType, LogisticsUnitState>> = {
  MATERIAL_RECEBIDO: "AGUARDANDO_INSPECAO",
  INSPECAO_CONCLUIDA: "DISPONIVEL",
  MATERIAL_ARMAZENADO: "ARMAZENADO",
  ESTOQUE_RESERVADO: "RESERVADO",
  MATERIAL_SEPARADO: "SEPARADO",
  REMESSA_EXPEDIDA: "EM_TRANSITO",
  MATERIAL_EM_TRANSITO: "EM_TRANSITO",
  MATERIAL_ENTREGUE: "ENTREGUE",
};

export interface ProjectionResult {
  state: LogisticsUnitState;
  locationId: string;
  condition: string;
  confidence: number;
  evidenceEventIds: string[];
  alerts: string[];
  updatedAt: string;
}

export function chronological(events: LogisticsEvent[]): LogisticsEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}

export function projectLogisticsUnit(
  unit: LogisticsUnit,
  allEvents: LogisticsEvent[],
): ProjectionResult {
  const unitEvents = chronological(
    allEvents.filter((event) => event.objectType === "LOGISTICS_UNIT" && event.objectId === unit.id),
  );
  const correctedEventIds = new Set(
    unitEvents
      .filter((event) => event.eventType === "EVENTO_CORRIGIDO")
      .map((event) => event.correctionOfEventId ?? String(event.payload.correctedEventId ?? ""))
      .filter(Boolean),
  );

  let state = unit.currentState;
  let locationId = unit.currentLocationId;
  let condition = unit.condition;
  let confidence = unit.confidence;
  const evidenceEventIds: string[] = [];
  const alerts: string[] = [];

  for (const event of unitEvents) {
    if (correctedEventIds.has(event.id)) {
      continue;
    }

    if (event.eventType === "DIVERGENCIA_REGISTRADA") {
      alerts.push(`${event.persistentCode}: ${String(event.payload.observed ?? "divergencia registrada")}`);
      evidenceEventIds.push(event.id);
      confidence = Math.min(confidence, event.confidence);
      continue;
    }

    if (event.eventType === "EVENTO_CORRIGIDO") {
      alerts.push(`${event.persistentCode}: correcao registrada sem apagar o historico`);
      if (event.condition) {
        condition = event.condition;
      }
      if (event.locationId) {
        locationId = event.locationId;
      }
      evidenceEventIds.push(event.id);
      confidence = Math.max(confidence, event.confidence);
      continue;
    }

    const nextState = stateByEvent[event.eventType];
    if (nextState) {
      state = nextState;
      locationId = event.locationId ?? locationId;
      condition = event.condition ?? condition;
      confidence = event.confidence;
      evidenceEventIds.push(event.id);
    }
  }

  return {
    state,
    locationId,
    condition,
    confidence,
    evidenceEventIds,
    alerts,
    updatedAt: unitEvents.at(-1)?.recordedAt ?? unit.updatedAt,
  };
}

export function projectNeed(need: Need, state: DemoState) {
  const coverages = state.needCoverages.filter((coverage) => coverage.needId === need.id);
  const totalCovered = coverages.reduce((sum, coverage) => sum + coverage.quantity, 0);
  const linkedLotIds = state.objectLinks
    .filter((link) => link.fromType === "NEED" && link.fromId === need.id && link.toType === "LOT")
    .map((link) => link.toId);
  const relatedUnits = state.logisticsUnits.filter((unit) => linkedLotIds.includes(unit.lotId));
  const delivered = relatedUnits
    .filter((unit) => projectLogisticsUnit(unit, state.events).state === "ENTREGUE")
    .reduce((sum, unit) => sum + unit.quantity, 0);
  const divergences = state.divergences.filter((divergence) =>
    state.eventRelations.some(
      (relation) =>
        relation.eventId === divergence.correctedByEventId ||
        (relation.relatedObjectType === "NEED" && relation.relatedObjectId === need.id),
    ),
  );

  return {
    totalCovered,
    coveragePercent: Math.round((totalCovered / need.quantityApproved) * 100),
    delivered,
    deliveredPercent: Math.round((delivered / need.quantityApproved) * 100),
    openDivergences: divergences.filter((divergence) => divergence.status !== "CORRIGIDA").length,
    correctedDivergences: divergences.filter((divergence) => divergence.status === "CORRIGIDA").length,
  };
}
