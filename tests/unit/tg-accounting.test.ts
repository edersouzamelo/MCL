import { describe, expect, it } from "vitest";
import { deriveCurrentExecution, deriveRpnpExecution } from "@/modules/credits-tg/accounting";

describe("relações contábeis do painel de créditos", () => {
  it("reconcilia a execução do exercício exibida pelo Power BI do Mendes", () => {
    const result = deriveCurrentExecution({
      provisionUpdatedCents: 4_443_735_757,
      committedCents: 4_138_269_316,
      liquidatedCents: 1_990_131_725,
    });
    expect(result.availableCreditCents).toBe(305_466_441);
    expect(result.committedToLiquidateCents).toBe(2_148_137_591);
    expect(result.committedRatio).toBeCloseTo(0.9313, 4);
    expect(result.liquidatedRatio).toBeCloseTo(0.4479, 4);
  });

  it("reconcilia o saldo de RPNP exibido pelo Power BI do Mendes", () => {
    const result = deriveRpnpExecution({
      registeredAndReinscribedCents: 870_796_670,
      liquidatedCents: 844_336_488,
      cancelledCents: 38_580,
    });
    expect(result.toLiquidateCents).toBe(26_421_602);
    expect(result.liquidatedRatio).toBeCloseTo(0.9696, 4);
    expect(result.cancelledRatio).toBeCloseTo(0.0000443, 7);
  });

  it("não fabrica percentual quando a base é zero", () => {
    expect(deriveCurrentExecution({ provisionUpdatedCents: 0, committedCents: 0, liquidatedCents: 0 }).committedRatio).toBeNull();
  });
});
