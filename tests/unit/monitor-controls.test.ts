import { describe, expect, it, vi, beforeEach } from "vitest";
import { ccoLocalDate, defaultCcoMonitorConfig, isCcoMonitorId, monitorUpdatedToday, parseCcoMonitorConfig } from "@/modules/grupamento/monitor";

const db = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), audit: vi.fn(), documents: vi.fn(), users: vi.fn(), contentEvents: vi.fn() }));
vi.mock("@/server/db", () => {
  const tx = { ccoMonitorConfiguration: { findMany: db.findMany, findUnique: db.findUnique, upsert: db.upsert }, auditLog: { create: db.audit } };
  return { prisma: { ...tx, monitorContentImport: { findMany: db.documents }, user: { findMany: db.users }, auditLog: { create: db.audit, findMany: db.contentEvents }, $transaction: (action: (value: typeof tx) => Promise<unknown>) => action(tx) } };
});
import { listCcoMonitorConfigs, saveCcoMonitorConfig } from "@/modules/grupamento/monitor-config-repository";

beforeEach(() => { vi.clearAllMocks(); db.findUnique.mockResolvedValue(null); db.documents.mockResolvedValue([]); db.users.mockResolvedValue([]); db.contentEvents.mockResolvedValue([]); });
describe("Controles CCOL", () => {
  it("preserva os oito monitores e isola Teste e Central", async () => {
    const defaults = defaultCcoMonitorConfig();
    expect(defaults.map(m => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(defaults[8].label).toBe("Monitor Teste");
    expect(defaults[9]).toMatchObject({ label: "Monitor Central", enabled: false, screens: [], responsibleSector: "Seção de Planejamento" });
    db.findMany.mockResolvedValue([{ monitorId: 1, updatedAt: new Date("2026-10-01T04:00:00Z"), updatedBy: "test-actor", configuration: { ...defaults[0], screens: [] } }]);
    const list = await listCcoMonitorConfigs("test-org");
    expect(list[0].screens).toEqual([]); expect(list[8]).toEqual(defaults[8]); expect(list[9]).toEqual(defaults[9]);
    await saveCcoMonitorConfig("test-org", "test-actor", { ...defaults[8], screens: ["class-ii"], responsibleSector: "Classe II", updatedOn: "2026-09-30" }, 9);
    expect(db.upsert).toHaveBeenCalledOnce();
    expect(db.upsert.mock.calls[0][0].where.organizationId_monitorId).toEqual({ organizationId: "test-org", monitorId: 9 });
    expect(db.audit.mock.calls[0][0].data.metadata.after).toMatchObject({ screens: ["class-ii"], responsibleSector: "Classe II", updatedOn: "2026-09-30" });
  });
  it("usa o evento mais recente e não aceita autoria informada pelo cliente", async () => {
    const config = defaultCcoMonitorConfig()[0];
    db.findMany.mockResolvedValue([{ monitorId: 1, configuration: config, updatedAt: new Date("2026-10-01T04:00:00Z"), updatedBy: "config-actor" }]);
    db.documents.mockResolvedValue([{ monitorId: 1, importedAt: new Date("2026-10-01T03:00:00Z"), importedBy: "upload-actor", importedByName: "Operador do upload", approvedAt: new Date("2026-10-01T05:00:00Z"), approvedBy: "approver", archivedAt: null, archivedBy: null }]);
    db.users.mockResolvedValue([{ id: "approver", name: "Aprovador" }]);
    expect((await listCcoMonitorConfigs("test-org"))[0]).toMatchObject({ updatedAt: "2026-10-01T05:00:00.000Z", updatedByName: "Aprovador" });
    await saveCcoMonitorConfig("test-org", "real-actor", { ...config, updatedAt: "2099-01-01", updatedByName: "Falso" }, 1);
    expect(db.upsert.mock.calls[0][0].create.updatedBy).toBe("real-actor");
    expect(db.upsert.mock.calls[0][0].create.configuration.updatedByName).toBeUndefined();
  });
  it("aceita configurações antigas e rejeita setores e IDs inválidos", () => {
    const { responsibleSector, updatedOn, ...legacy } = defaultCcoMonitorConfig()[0];
    expect(responsibleSector).toBeNull(); expect(updatedOn).toBeNull();
    expect(parseCcoMonitorConfig(legacy, 1)?.responsibleSector).toBeNull();
    expect(parseCcoMonitorConfig({ ...legacy, responsibleSector: "Inválido" }, 1)).toBeNull();
    for (const id of [0, 11, 1.5, NaN]) expect(isCcoMonitorId(id)).toBe(false);
    expect(isCcoMonitorId(10)).toBe(true);
  });
  it("a confirmação diária vence à meia-noite em Campo Grande", () => {
    expect(ccoLocalDate(new Date("2026-10-01T03:59:59Z"))).toBe("2026-09-30");
    expect(monitorUpdatedToday({ updatedOn: "2026-09-30" }, new Date("2026-10-01T03:59:59Z"))).toBe(true);
    expect(monitorUpdatedToday({ updatedOn: "2026-09-30" }, new Date("2026-10-01T04:00:00Z"))).toBe(false);
  });
});
