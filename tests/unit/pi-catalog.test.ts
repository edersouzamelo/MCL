import { describe, expect, it } from "vitest";
import { collectPiDescriptions, withPiDescriptions } from "@/modules/grupamento/pi-catalog";

describe("PI descriptions learned from SAG", () => {
  it("reuses an exact PI description in a later load without Nome_PI, preserving source and amounts", () => {
    const catalog = collectPiDescriptions([{ pi: " e6mipljbids ", piName: "Bandeiras, insígnias e distintivos" }]);
    const input = [{ pi: "E6MIPLJBIDS", paid: 337728.82, piName: "" }];
    expect(withPiDescriptions(input, catalog)).toEqual([{ ...input[0], piName: "Bandeiras, insígnias e distintivos" }]);
    expect(input[0].piName).toBe("");
    expect(withPiDescriptions([{ pi: "E6MISOLBIDS" }], catalog)).toEqual([{ pi: "E6MISOLBIDS" }]);
  });
  it("keeps the explicit source description and rejects conflicting names within a load", () => {
    const rows = [{ pi: "PI1", piName: "A" }, { pi: "PI1", piName: "B" }, { pi: "PI2", piName: "C" }, { pi: "", piName: "D" }];
    expect(collectPiDescriptions(rows)).toEqual({ PI2: "C" });
    expect(withPiDescriptions([{ pi: "PI2", piName: "New source name" }], { PI2: "C" })[0].piName).toBe("New source name");
    expect(collectPiDescriptions([{ pi: "PI2", piName: " " }])).toEqual({});
  });
});
