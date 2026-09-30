import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findOmCrest, OM_CREST_CATALOG, omMentionParts, omDisplayName } from "@/modules/grupamento/om-crests";

describe("official OM emblems", () => {
  it("retains traceable source and transparent PNGs for all 54 symbols", () => {
    expect(OM_CREST_CATALOG.units).toHaveLength(54);
    expect(OM_CREST_CATALOG.source.sha256).toHaveLength(64);
    for (const unit of OM_CREST_CATALOG.units) {
      const png = readFileSync(`public${unit.image}`);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png[25]).toBe(6); // PNG RGBA, not a flattened square.
      expect(png.readUInt32BE(16)).toBe(unit.width);
      expect(png.readUInt32BE(20)).toBe(unit.height);
      expect(findOmCrest(unit.name)?.id).toBe(unit.id);
    }
  });
  it("matches SAG spacing and ordinals while separating similar units", () => {
    expect(findOmCrest("9Bsup")?.id).toBe("9-b-sup");
    expect(findOmCrest("9º BEC")?.id).toBe("9-be-c");
    expect(findOmCrest("9 BE CMB")?.id).toBe("9-be-cmb");
    expect(findOmCrest("Cia C 9 Gpt Log")?.id).toBe("ciac-9-gpt-log");
    expect(findOmCrest("9GptLog")?.id).toBe("9-gpt-log");
    expect(findOmCrest("OM sem identificação")).toBeUndefined();
    expect(findOmCrest("9 B Sup desconhecido")).toBeUndefined();
  });
  it("resolves user-confirmed OM labels and corrects the battery identity", () => {
    const labels = [
      ["Cmdo 9º Gpt Log", "9-gpt-log"],
      ["Ba Adm Ap / CMO", "b-adm-ap-cmo"],
      ["Cmdo Fron- Jauru/66º BI Mtz", "c-fron-jauru-66-bi-mtz"],
      ["Cmdo 13ª Bda Inf Mtz", "13-bda-inf-mtz"],
      ["3ª Bia AAAe", "3-bia-aaa-e"],
      ["Cmdo 9ª RM", "9-rm"],
      ["Cmdo 4ª Bda C Mec", "4-bda-c-mec"],
      ["Cmdo 18ª Bda Inf Pantanal", "18-bda-inf-pan"],
      ["4ª Cia E Cmb Mec", "4-cia-e-cmb-mec"],
      ["6º BIM", "6-bim"],
    ];
    for (const [label, id] of labels) {
      expect(findOmCrest(label)?.id).toBe(id);
      const text = `Apoio: ${label}.`;
      const parts = omMentionParts(text);
      expect(parts.map(part => part.text).join("")).toBe(text);
      expect(parts.flatMap(part => part.om ? [part.om.id] : [])).toEqual([id]);
    }
    expect(findOmCrest("9ª Bia AAAe")).toBeUndefined();
    expect(findOmCrest("Cia C 9 Gpt Log")?.id).toBe("ciac-9-gpt-log");
  });
  it("ignores only a trailing leaked UG column label without fuzzy OM matching", () => {
    expect(findOmCrest("Cmdo 4ª Bda C Mec NOME_UG")?.id).toBe("4-bda-c-mec");
    expect(findOmCrest("4ª Cia E Cmb Mec NOME_UG")?.id).toBe("4-cia-e-cmb-mec");
    expect(omDisplayName("4ª Cia E Cmb Mec NOME_UG")).toBe("4ª Cia E Cmb Mec");
    expect(findOmCrest("4ª Cia E Cmb Mec desconhecida")).toBeUndefined();
    expect(findOmCrest("4ª Cia E Cmb Mec NOME_UG outra OM")).toBeUndefined();
  });
  it("recognizes distinct OM mentions without replacing the source wording", () => {
    const text = "Apoio: 9º BEC, 9 BE Cmb e Cia C 9 Gpt Log. 999 B Sup não cadastrado.";
    const parts = omMentionParts(text);
    expect(parts.map(part => part.text).join("")).toBe(text);
    expect(parts.flatMap(part => part.om ? [part.om.id] : [])).toEqual(["9-be-c", "9-be-cmb", "ciac-9-gpt-log"]);
  });
});
