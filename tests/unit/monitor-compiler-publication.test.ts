import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ find: vi.fn(), scenes: vi.fn(), update: vi.fn(), result: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db", () => ({ prisma: { $transaction: db.transaction } }));
import { setMonitorContentStatus } from "@/modules/grupamento/monitor-content/repository";
const input = { id: "import", organizationId: "org", actorId: "actor", status: "APPROVED" as const };
beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.mockImplementation(async callback => callback({ monitorContentImport: { findFirst: db.find, updateMany: db.update, findUniqueOrThrow: db.result }, monitorContentScene: { findMany: db.scenes } }));
  db.find.mockResolvedValue({ status: "PREVIEW" });
  db.update.mockResolvedValue({ count: 1 });
  db.result.mockResolvedValue({ id: "import", status: "APPROVED" });
});
describe("compiler publication gate", () => {
  it("keeps incomplete content in preview without writing approval", async () => {
    db.scenes.mockResolvedValue([{ payload: { inputCompiler: { preflight: { status: "BLOCKED" } } } }]);
    await expect(setMonitorContentStatus(input)).rejects.toThrow("Preflight bloqueou");
    expect(db.update).not.toHaveBeenCalled();
  });
  it("permits structurally valid content within a serializable transaction", async () => {
    db.scenes.mockResolvedValue([{ payload: { inputCompiler: { preflight: { status: "PASS" } } } }]);
    await expect(setMonitorContentStatus(input)).resolves.toMatchObject({ status: "APPROVED" });
    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "import", organizationId: "org", status: "PREVIEW" } }));
  });
  it("retains legacy approval compatibility", async () => {
    db.scenes.mockResolvedValue([{ payload: { bullets: ["Conteúdo anterior"] } }]);
    await expect(setMonitorContentStatus(input)).resolves.toMatchObject({ status: "APPROVED" });
  });
});
