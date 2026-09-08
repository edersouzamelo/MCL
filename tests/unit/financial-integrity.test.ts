import { describe, expect, it } from "vitest";
import { checksumBuffer } from "@/modules/financial-snapshots/repository";
import { legacyFinancialApiDisabled } from "@/modules/financial-snapshots/legacy-api";
import { getSiloCatalog } from "@/modules/ai/silos";

describe("integridade da fonte financeira", () => {
  it("gera checksum determinístico do arquivo recebido", () => {
    const first = checksumBuffer(new TextEncoder().encode("fonte-a").buffer);
    const repeated = checksumBuffer(new TextEncoder().encode("fonte-a").buffer);
    const other = checksumBuffer(new TextEncoder().encode("fonte-b").buffer);
    expect(first).toBe(repeated);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("desativa endpoints financeiros legados sem devolver fallback", async () => {
    const response = legacyFinancialApiDisabled();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "LEGACY_FINANCIAL_API_DISABLED",
      dataNature: "NONE",
    });
  });

  it("não declara silos financeiros disponíveis sem banco", () => {
    const catalog = getSiloCatalog(false);
    const financial = catalog.data.silos.filter((silo) => silo.id === "CREDITOS" || silo.id === "GRUPAMENTO");
    expect(financial).toHaveLength(2);
    expect(financial.every((silo) => silo.status === "UNAVAILABLE")).toBe(true);
  });
});
