import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

/**
 * Executes the REAL .gs source in an isolated Apps Script API emulator.
 * Unit tests do not assert that the installed trigger or production token works.
 */
const source = readFileSync(resolve(process.cwd(), "integrations/apps-script/robo-mcl-tg.gs"), "utf8");
const attachment = (name: string, size = 2_500_000) => ({
  getName: () => name,
  getBytes: () => Array.from({ length: size }, (_, i) => i % 255),
});
function email(id: string, name: string, at: string, from = "naoresponda@serpro.gov.br") {
  return {
    getId: () => id,
    getSubject: () => name.replace(/\.xlsx?$/i, ""),
    getFrom: () => from,
    getDate: () => new Date(at),
    getAttachments: () => [attachment(name)],
  };
}

function harness(config?: {
  messages?: ReturnType<typeof email>[];
  statusSequence?: number[];
  endWithoutChecksum?: boolean;
  missingToken?: boolean;
}) {
  const props = new Map<string, string>([
    ["MCL_WEBHOOK_TOKEN", "test-token"],
    ["MCL_ORGANIZATION_CODE", "160136"],
  ]);
  if (config?.missingToken) props.delete("MCL_WEBHOOK_TOKEN");
  const messages = config?.messages ?? [
    email("latest-v2", "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx", "2026-10-20T11:00:00Z"),
  ];
  const logs: string[] = [];
  const post = vi.fn((url: string, req: { payload: { chunkIndex: string; chunkCount: string; uploadId: string; originalFileName: string } }) => {
    const status = config?.statusSequence?.shift() ?? 200;
    const final = Number(req.payload.chunkIndex) === Number(req.payload.chunkCount) - 1;
    const body = status >= 400
      ? { success: false, error: "Falha simulada HTTP" }
      : final ? config?.endWithoutChecksum
        ? { success: true, complete: true }
        : { success: true, complete: true, checksum: "abc", rowCount: 24512, persistedAt: "2026-10-20T11:03:00Z" }
        : { success: true, complete: false };
    return { getResponseCode: () => status, getContentText: () => JSON.stringify(body) };
  });
  const lock = { tryLock: () => true, releaseLock: vi.fn() };
  const ctx = createContext({
    GmailApp: { search: () => [{ getMessages: () => messages }] },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key: string) => props.get(key) ?? null,
      setProperty: (key: string, val: string) => { props.set(key, val); },
    }) },
    LockService: { getScriptLock: () => lock },
    UrlFetchApp: { fetch: post },
    Utilities: {
      getUuid: () => "12345678-abcd-4ef0-bbbb-123456789012",
      newBlob: (bytes: number[], mime: string, name: string) => ({ bytes, mime, name }),
      sleep: vi.fn(),
    },
    console: {
      log: (message: string) => logs.push(message),
      warn: (message: string) => logs.push(message),
      error: (message: string) => logs.push(message),
    },
  });
  runInContext(source, ctx, { timeout: 2000 });
  const execute = () => runInContext("enviarPlanilhaSiafiParaMCL()", ctx, { timeout: 15000 });
  return { execute, post, props, lock, logs };
}

describe("Robô TG instalado: contrato e resiliência (código-fonte .gs real)", () => {
  it("seleciona o relatório V2 mais recente, nunca o EXERCICIO legado", () => {
    const h = harness({ messages: [
      email("v1-newer", "MCL_MESTRE_EXERCICIO_2026.xlsx", "2026-10-20T13:00:00Z"),
      email("v2-old", "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx", "2026-10-19T11:00:00Z"),
      email("v2-new", "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx", "2026-10-20T11:00:00Z"),
    ] });
    h.execute();
    expect(h.post).toHaveBeenCalledTimes(2);
    expect(h.post.mock.calls[0][1].payload.originalFileName).toBe("MCL_MESTRE_CREDITOS_V2_TESTE.xlsx");
    expect(h.post.mock.calls[0][1].payload.uploadId).toBe(h.post.mock.calls[1][1].payload.uploadId);
    expect(h.props.get("MCL_TG_LAST_SUCCESS_EMAIL_AT")).toBe(String(Date.parse("2026-10-20T11:00:00Z")));
    expect(h.logs.join(" ")).toContain("TG_PERSISTIDO");
  });
  it("não retransmite o mesmo e-mail depois que o servidor confirmou a persistência", () => {
    const h = harness();
    h.execute();h.execute();
    expect(h.post).toHaveBeenCalledTimes(2);
    expect(h.logs.join(" ")).toContain("TG_ALREADY_CONFIRMED");
  });
  it("retenta 503 no mesmo bloco, prossegue e guarda progresso só após checksum persistido", () => {
    const h = harness({ statusSequence: [503, 200, 200] });
    h.execute();
    expect(h.post).toHaveBeenCalledTimes(3);
    expect(h.props.get("MCL_TG_LAST_SUCCESS_EMAIL_AT")).toBeDefined();
  });
  it("401 é erro permanente: não reenvia, não avança estado nem considera sucesso", () => {
    const h = harness({ statusSequence: [401] });
    expect(() => h.execute()).toThrow("TG_UPLOAD_HTTP_401");
    expect(h.post).toHaveBeenCalledTimes(1);
    expect(h.props.has("MCL_TG_LAST_SUCCESS_EMAIL_AT")).toBe(false);
    expect(h.lock.releaseLock).toHaveBeenCalled();
    expect(h.logs.join(" ")).toContain("TG_SYNC_FAILED");
  });
  it("se o upload não confirmou checksum, jamais avança estado", () => {
    const h = harness({ endWithoutChecksum: true });
    expect(() => h.execute()).toThrow("TG_NOT_PERSISTED");
    expect(h.props.has("MCL_TG_LAST_SUCCESS_EMAIL_AT")).toBe(false);
  });
  it("não degrada silenciosamente para fonte antiga quando falta V2", () => {
    const h = harness({ messages: [email("legacy", "MCL_MESTRE_EXERCICIO_2026.xlsx", "2026-10-20T13:00:00Z")] });
    expect(() => h.execute()).toThrow("TG_NO_SOURCE");
    expect(h.post).not.toHaveBeenCalled();
  });
  it("falha explicitamente sem token em vez de enviar anexo sem credencial", () => {
    const h = harness({ missingToken: true });
    expect(() => h.execute()).toThrow("MCL_WEBHOOK_TOKEN");
    expect(h.post).not.toHaveBeenCalled();
  });
});
