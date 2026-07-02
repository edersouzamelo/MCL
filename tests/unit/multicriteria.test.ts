import { describe, expect, it } from "vitest";
import { createDemoState } from "@/modules/demo/data";
import { scoreNeed, validateWeights } from "@/modules/analytics/multicriteria";

describe("analise multicriterio deterministica", () => {
  it("exige soma de pesos igual a 100", () => {
    const demo = createDemoState();
    expect(() => validateWeights(demo.multicriteriaWeights[0])).not.toThrow();
    expect(() => validateWeights({ ...demo.multicriteriaWeights[0], urgency: 10 })).toThrow(/100/);
  });

  it("produz resultado reproduzivel sem LLM", () => {
    const demo = createDemoState();
    const result = scoreNeed(
      {
        need: demo.needs[0],
        stockCoveragePercent: 100,
        daysUntilRequired: 18,
        connectorRisk: 2,
        financialCoveragePercent: 73,
      },
      demo.multicriteriaWeights[0],
    );

    expect(result.score).toBe(54.97);
    expect(result.weightsVersion).toBe("demo-2026-07-02");
  });
});
