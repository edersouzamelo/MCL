import { describe, expect, it } from "vitest";
import { catmatSearchTokens } from "@/modules/coverage/catmat-index";

describe("catmatSearchTokens", () => {
  it("normaliza e extrai tokens com tamanho minimo 3", () => {
    const tokens = catmatSearchTokens(" Coturno  tatico  militar ");
    expect(tokens).toEqual(["coturno", "tatico", "militar"]);
  });

  it("remove stopwords comuns e funcionais", () => {
    const tokens = catmatSearchTokens("coturno para uso operacional tipo item 01");
    expect(tokens).not.toContain("para");
    expect(tokens).not.toContain("uso");
    expect(tokens).not.toContain("operacional");
    expect(tokens).not.toContain("tipo");
    expect(tokens).not.toContain("item");
    expect(tokens).toContain("coturno");
  });

  it("elimina tokens duplicados preservando a ordem", () => {
    const tokens = catmatSearchTokens("coturno militar coturno preto militar");
    expect(tokens).toEqual(["coturno", "militar", "preto"]);
  });

  it("preserva codigos numericos com 4 ou mais digitos", () => {
    const tokens = catmatSearchTokens("coturno 452757");
    expect(tokens).toContain("coturno");
    expect(tokens).toContain("452757");
  });

  it("descarta numeros curtos com menos de 4 digitos", () => {
    const tokens = catmatSearchTokens("coturno 12");
    expect(tokens).toContain("coturno");
    expect(tokens).not.toContain("12");
  });
});
