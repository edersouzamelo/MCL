import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findOmCrest, OM_CREST_CATALOG, omMentionParts } from "@/modules/grupamento/om-crests";

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
  it("recognizes distinct OM mentions without replacing the source wording", () => {
    const text = "Apoio: 9º BEC, 9 BE Cmb e Cia C 9 Gpt Log. 999 B Sup não cadastrado.";
    const parts = omMentionParts(text);
    expect(parts.map(part => part.text).join("")).toBe(text);
    expect(parts.flatMap(part => part.om ? [part.om.id] : [])).toEqual(["9-be-c", "9-be-cmb", "ciac-9-gpt-log"]);
  });
});
