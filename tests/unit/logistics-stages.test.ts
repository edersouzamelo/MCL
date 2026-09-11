import { describe, expect, it } from "vitest";
import { LOGISTICS_STAGES } from "@/modules/logistics/stages";

describe("macroestrutura logística", () => {
  it("mantém as oito etapas na ordem operacional definida", () => {
    expect(LOGISTICS_STAGES.map((stage) => stage.id)).toEqual([
      "necessidade",
      "credito",
      "aquisicao",
      "recebimento",
      "armazenagem",
      "entrega",
      "manutencao",
      "recolhimento",
    ]);
  });

  it("não repete números, rotas ou domínios", () => {
    for (const field of ["number", "href", "domain"] as const) {
      const values = LOGISTICS_STAGES.map((stage) => stage[field]);
      expect(new Set(values).size).toBe(LOGISTICS_STAGES.length);
    }
  });
});
