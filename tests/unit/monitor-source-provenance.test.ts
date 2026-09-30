import { describe, expect, it } from "vitest";
import { formatMonitorSourceDate, sagMonitorProvenance } from "@/modules/grupamento/source-provenance";

describe("SAG monitor source dates", () => {
  it("identifies today's already published PDFs even without a report date", () => {
    expect(sagMonitorProvenance(
      { importedAt: "2026-09-30T13:06:44.790Z" },
      { importedAt: "2026-09-30T13:06:42.699Z" },
    )).toBe("Fonte: SAG · importado em 30/09/2026");
  });

  it("preserves the report date when an older report is uploaded today", () => {
    const source = { referenceDate: "2026-09-29", importedAt: "2026-09-30T13:06:44Z" };
    expect(sagMonitorProvenance(source, source)).toBe("Fonte: SAG · referência 29/09/2026");
  });

  it("keeps distinct dates and distinct date meanings for the two sources", () => {
    expect(sagMonitorProvenance(
      { referenceDate: "2026-09-29", importedAt: "2026-09-30T13:06:44Z" },
      { importedAt: "2026-09-30T13:06:42Z" },
    )).toBe("Fonte: SAG · EC referência 29/09/2026 · RPNP importado em 30/09/2026");
    expect(sagMonitorProvenance(
      { importedAt: "2026-09-30T13:06:44Z" },
      { importedAt: "2026-09-29T13:06:42Z" },
    )).toBe("Fonte: SAG · EC importado em 30/09/2026 · RPNP importado em 29/09/2026");
  });

  it("uses Campo Grande's date even when the UTC upload day has changed", () => {
    expect(formatMonitorSourceDate("2026-10-01T02:30:00Z")).toBe("30/09/2026");
    expect(formatMonitorSourceDate("2026-09-30")).toBe("30/09/2026");
  });

  it("does not invent a date for missing or invalid provenance", () => {
    expect(formatMonitorSourceDate("invalid")).toBeUndefined();
    expect(sagMonitorProvenance(null, null)).toBe("Fonte: SAG · data não identificada");
    const source = { referenceDate: "invalid", importedAt: "2026-09-30T13:06:44Z" };
    expect(sagMonitorProvenance(source, source)).toBe("Fonte: SAG · importado em 30/09/2026");
  });
});
