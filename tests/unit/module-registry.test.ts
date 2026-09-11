import { describe, expect, it } from "vitest";
import { COMPLEMENTARY_MODULES, SUPPLEMENTARY_MODULES } from "@/modules/system/module-registry";

describe("module registry", () => {
  it("mantém os módulos de apoio fora das oito etapas logísticas", () => {
    expect(COMPLEMENTARY_MODULES).toHaveLength(7);
    expect(SUPPLEMENTARY_MODULES).toHaveLength(3);
  });

  it("adota o Registro de Continuidade Logística como conceito federado", () => {
    const registry = COMPLEMENTARY_MODULES.find((module) => module.id === "registro-continuidade");
    expect(registry?.title).toBe("Registro de Continuidade Logística");
    expect(registry?.description).toContain("sem fundir");
  });

  it("não repete identificadores dentro da taxonomia", () => {
    const ids = [...COMPLEMENTARY_MODULES, ...SUPPLEMENTARY_MODULES].map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
