import { describe, expect, it } from "vitest";
import { createDemoState } from "@/modules/demo/data";
import { createLogisticsEvent } from "@/modules/events/service";
import { projectLogisticsUnit, projectNeed } from "@/modules/events/projection";

function state() {
  return JSON.parse(JSON.stringify(createDemoState())) as ReturnType<typeof createDemoState>;
}

describe("projecao de eventos logisticos", () => {
  it("calcula estado consolidado e preserva evidencia", () => {
    const demo = state();
    const unit = demo.logisticsUnits.find((candidate) => candidate.id === "unit-coturno-001")!;
    const projection = projectLogisticsUnit(unit, demo.events);

    expect(projection.state).toBe("ENTREGUE");
    expect(projection.locationId).toBe("loc-bravo-recebimento");
    expect(projection.evidenceEventIds).toContain("evt-013");
  });

  it("nao duplica evento com a mesma idempotency key", () => {
    const demo = state();
    const input = {
      eventType: "MATERIAL_ARMAZENADO",
      logisticsUnitId: "unit-coturno-010",
      quantity: 20,
      unit: "par",
      locationId: "loc-armazem-alfa-a",
      condition: "CONFORME",
      note: "Teste unitario",
      idempotencyKey: "unit-test-idempotency-key",
    };

    const first = createLogisticsEvent(demo, input, ["ADMIN"]);
    const second = createLogisticsEvent(demo, input, ["ADMIN"]);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(demo.events.filter((event) => event.idempotencyKey === input.idempotencyKey)).toHaveLength(1);
  });

  it("calcula cobertura da necessidade principal", () => {
    const demo = state();
    const need = demo.needs.find((candidate) => candidate.id === "need-coturno-200")!;
    const projection = projectNeed(need, demo);

    expect(projection.coveragePercent).toBe(100);
    expect(projection.delivered).toBeGreaterThan(0);
  });
});
