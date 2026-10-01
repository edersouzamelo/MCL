import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), readFile: vi.fn() }));
vi.mock("@vercel/sandbox", () => ({ Sandbox: { create: mocks.create } }));
vi.mock("@/server/db", () => ({ prisma: { monitorCompilerDecision: mocks } }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
import { renderInSandbox } from "@/modules/grupamento/monitor-content/compiler/sandbox-renderer";
const vm = () => ({ runCommand: vi.fn().mockResolvedValue({ exitCode: 0 }), stop: vi.fn().mockResolvedValue(undefined), snapshot: vi.fn().mockResolvedValue({ snapshotId: "software-snapshot" }), writeFiles: vi.fn().mockResolvedValue(undefined), readFileToBuffer: vi.fn().mockResolvedValue(Buffer.from('{"pages":[]}')) });
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("VERCEL_OIDC_TOKEN", "synthetic-test-identity"); vi.stubEnv("MCL_COMPILER_SANDBOX", "1"); mocks.readFile.mockResolvedValue(Buffer.from("renderer software")); });
describe("native rendering isolation", () => {
  it("snapshots only software and converts user bytes in a separate VM without outbound networking", async () => {
    const preparation = vm(), conversion = vm();
    mocks.findUnique.mockResolvedValue(null); mocks.create.mockResolvedValueOnce(preparation).mockResolvedValueOnce(conversion);
    await renderInSandbox(Buffer.from("private source bytes"), "pptx");
    expect(preparation.writeFiles).not.toHaveBeenCalled(); expect(preparation.snapshot).toHaveBeenCalledOnce();
    expect(mocks.upsert.mock.calls[0][0].create.decision).toEqual({ snapshotId: "software-snapshot" });
    expect(mocks.create.mock.calls[1][0]).toMatchObject({ source: { type: "snapshot" }, persistent: false, networkPolicy: "deny-all" });
    expect(conversion.writeFiles.mock.calls[0][0][2]).toEqual({ path: "/tmp/source.pptx", content: Buffer.from("private source bytes") });
    expect(conversion.snapshot).not.toHaveBeenCalled(); expect(conversion.stop).toHaveBeenCalledOnce();
  });
  it("reuses software cache and destroys the conversion VM on a failed converter", async () => {
    const conversion = vm(); conversion.runCommand.mockResolvedValue({ exitCode: 1 });
    mocks.findUnique.mockResolvedValue({ decision: { snapshotId: "cached" } }); mocks.create.mockResolvedValue(conversion);
    await expect(renderInSandbox(Buffer.from("source"), "pdf")).rejects.toThrow("referência íntegra");
    expect(mocks.create).toHaveBeenCalledOnce(); expect(conversion.stop).toHaveBeenCalledOnce();
  });
  it("rejects missing project identity before reading source or creating infrastructure", async () => {
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    await expect(renderInSandbox(Buffer.from("source"), "docx")).rejects.toThrow("indisponível");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.readFile).not.toHaveBeenCalled();
  });
});
