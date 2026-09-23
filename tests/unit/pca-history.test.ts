import { beforeEach, describe, expect, it, vi } from "vitest";
const database = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { pcaItemRevision: database } }));
import { historyQuery, pcaHistory } from "@/modules/pca/history";
beforeEach(() => { vi.resetAllMocks(); });
describe("PCA revision history authorization and pagination", () => {
  it("rejects invalid sources and unbounded filters", () => {
    expect(() => historyQuery(new URLSearchParams({ source: "other" }))).toThrow();
    expect(() => historyQuery(new URLSearchParams({ q: "x".repeat(201) }))).toThrow();
  });
  it("scopes historical detail even when the caller supplies another organization's revision id", async () => {
    database.findFirst.mockResolvedValue(null);
    await expect(pcaHistory("authorized-org", 2026, new URLSearchParams({ revisionId: "foreign" }))).rejects.toThrow("escopo autorizado");
    expect(database.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", item: { organizationId: "authorized-org", year: 2026 } } });
  });
  it("returns inactive item history and pages without loading snapshot payloads", async () => {
    database.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ id: String(i) })));
    const result = await pcaHistory("org", 2026, new URLSearchParams({ itemId: "item" }));
    expect(result).toMatchObject({ nextCursor: "19" });
    expect(result.revisions).toHaveLength(20);
    const args = database.findMany.mock.calls[0][0];
    expect(args.where.item).toEqual({ organizationId: "org", year: 2026, id: "item" });
    expect(args.select.payload).toBeUndefined();
  });
  it("rejects a cursor outside the authorized filter", async () => {
    database.findFirst.mockResolvedValue(null);
    await expect(pcaHistory("org", 2026, new URLSearchParams({ cursor: "foreign", source: "PGC" }))).rejects.toThrow("Página");
    expect(database.findMany).not.toHaveBeenCalled();
  });
});
