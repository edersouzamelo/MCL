import { describe, expect, it } from "vitest";
import { computeSagSnapshot, parseSagNumber } from "@/modules/grupamento/sag";

describe("SAG deterministic calculations", () => {
  it("parses Brazilian monetary values and exported total labels", () => {
    expect(parseSagNumber("1.234.567,89")).toBeCloseTo(1234567.89, 2);
    expect(parseSagNumber("Σ Tela: 24.880.486,49")).toBeCloseTo(24880486.49, 2);
    expect(parseSagNumber("86.94%")).toBeCloseTo(86.94, 2);
  });

  it("computes commitment and liquidation without trusting spreadsheet percentages", () => {
    const snapshot = computeSagSnapshot({
      available: 20,
      toLiquidate: 30,
      inLiquidation: 10,
      liquidated: 15,
      paid: 25,
    });

    expect(snapshot.total).toBe(100);
    expect(snapshot.committed).toBe(80);
    expect(snapshot.liquidatedTotal).toBe(40);
    expect(snapshot.committedPercent).toBe(80);
    expect(snapshot.liquidatedPercent).toBe(40);
  });

  it("returns zero percentages for an empty financial snapshot", () => {
    const snapshot = computeSagSnapshot({
      available: 0,
      toLiquidate: 0,
      inLiquidation: 0,
      liquidated: 0,
      paid: 0,
    });

    expect(snapshot.total).toBe(0);
    expect(snapshot.committedPercent).toBe(0);
    expect(snapshot.liquidatedPercent).toBe(0);
  });
});
