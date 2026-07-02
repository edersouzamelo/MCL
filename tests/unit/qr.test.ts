import { describe, expect, it } from "vitest";
import { resolveQrInput } from "@/server/demo-store";

describe("validacao de QR", () => {
  it("aceita identificador MCL", () => {
    expect(resolveQrInput("MCL:UL:ul-coturno-caixa-001")).toBe("ul-coturno-caixa-001");
  });

  it("aceita URL controlada", () => {
    expect(resolveQrInput("https://piloto.invalid/unidades/ul-coturno-caixa-001")).toBe("ul-coturno-caixa-001");
  });

  it("rejeita codigo externo", () => {
    expect(() => resolveQrInput("https://externo.invalid/abc")).toThrow(/formato rejeitado/i);
  });
});
