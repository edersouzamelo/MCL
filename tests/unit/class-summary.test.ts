import { describe, expect, it } from "vitest";
import { CCO_CLASS_GROUPS } from "@/modules/grupamento/cco";
import { buildCcoClassSummary, CCO_SUMMARY_ROWS_PER_PAGE, paginateClassSummary, summaryClassId } from "@/modules/grupamento/class-summary";
import { CCO_SCREEN_CATALOG, ccoScreenDescription, defaultCcoMonitorConfig, parseCcoMonitorConfig } from "@/modules/grupamento/monitor";
import { computeSagSnapshot, type SagRow } from "@/modules/grupamento/sag";

// Explicit test fixtures, never imported as operational SAG data.
function row(pi: string, ug = "160136", available = 1, paid = 4): SagRow {
  const financial = { available, toLiquidate: 2, inLiquidation: 3, liquidated: 0, paid };
  return { pi, ug, sheet: "FIXTURE DE TESTE", ...financial, computed: computeSagSnapshot(financial), percentDivergence: false };
}

describe("class summaries from the algoritmo.xlsx matrix", () => {
  it("counts a PI shared by QR and regional reserve only once, aggregating all UGs", () => {
    const rows = [row("E6SUPLJA3RR"), row("E6SUPLJA3RR", "160142"), row("E6SUPLJA2QS")];
    const summary = buildCcoClassSummary("class-i", rows);
    expect(summary.total).toBe(30);
    expect(summary.byPi).toHaveLength(2);
    expect(summary.byPi.find((item) => item.pi === "E6SUPLJA3RR")?.total).toBe(20);
    expect(summary.byPi.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100);
  });
  it("uses exact codes, preserves cents and never substitutes forecast values", () => {
    const rows = [row(" e6suplja2qs ", "160136", .01, .02), row("E6SUPLJA2QS-UNKNOWN"), row("E6MIPLJBIDS")];
    const summary = buildCcoClassSummary("class-i", rows);
    expect(summary.total).toBeCloseTo(5.03);
    expect(summary.byPi.map((item) => item.pi)).toEqual(["E6SUPLJA2QS"]);
    expect(summary.unmappedPurposes).toContain("Mnt Rancho");
  });
  it("keeps all matched PIs for pagination, with a full-class denominator on every page", () => {
    const codes = [...new Set(CCO_CLASS_GROUPS.filter((group) => group.classId === "class-i").flatMap((group) => group.piCodes))];
    const summary = buildCcoClassSummary("class-i", codes.map((pi) => row(pi)));
    expect(summary.byPi).toHaveLength(codes.length);
    expect(summary.byPi.length).toBeGreaterThan(CCO_SUMMARY_ROWS_PER_PAGE);
    expect(summary.total).toBe(codes.length * 10);
    expect(summary.byPi.reduce((sum, item) => sum + item.total, 0)).toBe(summary.total);
    expect(summary.missingPiCodes).toEqual([]);
  });
  it("reports missing source records and keeps zero and negative balances", () => {
    expect(buildCcoClassSummary("class-viii", []).total).toBe(0);
    expect(buildCcoClassSummary("class-viii", []).byPi).toEqual([]);
    expect(buildCcoClassSummary("class-viii", []).missingPiCodes).toContain("D8SAFCTACL8");
    expect(buildCcoClassSummary("class-viii", [row("D8SAFCTACL8", "167143", -5, 0)]).byPi[0].total).toBe(0);
    expect(buildCcoClassSummary("class-viii", [row("D8SAFCTACL8", "167143", -6, 0)]).byPi[0].total).toBe(-1);
  });
  it("persists each summary selection without changing defaults and describes every SAG screen", () => {
    const config = defaultCcoMonitorConfig()[0];
    expect(config.screens).toEqual(["overview", "execution", "rpn"]);
    for (const screen of CCO_SCREEN_CATALOG) {
      expect(ccoScreenDescription(screen.id).length).toBeGreaterThan(20);
      if (!screen.id.endsWith("-summary")) continue;
      expect(summaryClassId(screen.id)).toBeDefined();
      expect(parseCcoMonitorConfig({ ...config, screens: [screen.id] }, 1)?.screens).toEqual([screen.id]);
      expect(ccoScreenDescription(screen.id)).toBe("Visualização do total de recursos recebidos desta classe distribuído por PI");
    }
    expect(summaryClassId("class-unknown-summary")).toBeUndefined();
    expect(summaryClassId("class-i")).toBeUndefined();
  });
});

describe("balanced PI pagination", () => {
  it("shows nine PIs together and balances larger lists without changing their order", () => {
    for (const [count, sizes] of [[9, [9]], [10, [5, 5]], [17, [9, 8]], [19, [7, 6, 6]]] as const) {
      const items = Array.from({ length: count }, (_, pi) => ({ pi, total: pi + .01 }));
      const pages = paginateClassSummary(items);
      expect(pages.map((page) => page.length)).toEqual(sizes);
      expect(pages.flat()).toEqual(items);
    }
  });
  it("never creates an orphan PI page after a full page", () => {
    for (let count = 2; count < 150; count++) {
      const pages = paginateClassSummary(Array.from({ length: count }, (_, i) => i));
      expect(pages.every((page) => page.length > 1 && page.length <= CCO_SUMMARY_ROWS_PER_PAGE)).toBe(true);
      expect(Math.max(...pages.map((page) => page.length)) - Math.min(...pages.map((page) => page.length))).toBeLessThanOrEqual(1);
    }
    expect(paginateClassSummary([])).toEqual([[]]);
  });
});
