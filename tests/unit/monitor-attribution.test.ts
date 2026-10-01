import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({config:vi.fn(),documents:vi.fn(),events:vi.fn(),users:vi.fn()}));
vi.mock("@/server/db", () => ({prisma:{ccoMonitorConfiguration:{findMany:db.config},monitorContentImport:{findMany:db.documents},auditLog:{findMany:db.events},user:{findMany:db.users}}}));
import { listCcoMonitorConfigs } from "@/modules/grupamento/monitor-config-repository";
const uploaded = new Date("2026-10-01T12:00:00Z"), approved = new Date("2026-10-01T12:10:00Z"), configured = new Date("2026-10-01T12:20:00Z");
const doc = {monitorId:8,importedAt:uploaded,importedBy:"usr-demo-operator",importedByName:"ST Luiz Henrique",approvedAt:approved,approvedBy:"usr-demo-operator",archivedAt:null,archivedBy:null};
beforeEach(() => {db.config.mockResolvedValue([]);db.documents.mockResolvedValue([doc]);db.events.mockResolvedValue([]);db.users.mockResolvedValue([{id:"usr-demo-operator",name:"Operador Demonstrativo",email:"operador.demo@mcl.invalid"}]);});
describe("monitor attribution for shared demonstration accounts", () => {
  it("retains the entered uploader name after approval and a later configuration change", async () => {
    db.config.mockResolvedValue([{monitorId:8,configuration:{id:8},updatedBy:"usr-demo-operator",updatedAt:configured}]);
    const result = await listCcoMonitorConfigs("org-test");
    expect(result[7].updatedByName).toBe("ST Luiz Henrique");
    expect(result[7].updatedAt).toBe(configured.toISOString());
    expect(db.documents).toHaveBeenCalledWith(expect.objectContaining({where:{organizationId:"org-test"}}));
  });
  it("keeps the registered actor when another user approves the upload", async () => {
    db.documents.mockResolvedValue([{...doc,approvedBy:"major"}]);
    db.users.mockResolvedValue([{id:"major",name:"Maj Eder",email:"eder@example.test"}]);
    expect((await listCcoMonitorConfigs("org-test"))[7].updatedByName).toBe("Maj Eder");
  });
  it("uses the latest entered upload name for a subsequent shared-account editor event", async () => {
    db.documents.mockResolvedValue([doc,{...doc,importedAt:new Date("2026-10-01T12:15:00Z"),importedByName:"Sgt Oliveira",approvedAt:null}]);
    db.events.mockResolvedValue([{occurredAt:configured,actorId:"usr-demo-operator",metadata:{monitorId:8,actorName:"Operador Demonstrativo"}}]);
    expect((await listCcoMonitorConfigs("org-test"))[7].updatedByName).toBe("Sgt Oliveira");
  });
  it("does not invent a person when there is no entered upload identification", async () => {
    db.documents.mockResolvedValue([{...doc,importedByName:"Operador Demonstrativo"}]);
    expect((await listCcoMonitorConfigs("org-test"))[7].updatedByName).toBe("Responsável não identificado");
  });
});
