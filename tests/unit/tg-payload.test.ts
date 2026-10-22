import { describe, expect, it } from "vitest";
import { encodeTgPayload, decodeTgPayload } from "@/modules/credits-tg/payload";
import type { TgReport } from "@/modules/credits-tg/parser";

const report = {
  schema: "TG_MASTER_V2", parserVersion: 3, fileName: "fonte.xlsx",
  sourceDate: null, metric: "Movim. Líquido", warnings: [],
  rows: [{ id: "Mestre:2", movementCents: -12345, pi: null,
    neDescription: "Descrição com ação e informação adicional", sourceRow: 2 }],
  emailReceivedAt: "2026-10-21T10:38:45.000Z",
} as unknown as TgReport & { emailReceivedAt: string };

describe("armazenamento TG sem perda", () => {
  it("preserva todos os campos, Unicode, sinais, nulos e a data do e-mail", () => {
    const decoded = decodeTgPayload(encodeTgPayload(report));
    expect(decoded).toEqual(report);
  });
  it("continua lendo lotes anteriores sem compressão", () => {
    expect(decodeTgPayload(report)).toEqual(report);
  });
  it("reduz cargas com descrições herdadas sem eliminar registros", () => {
    const large = { ...report, rows: Array.from({ length: 10000 }, (_, index) => ({ ...report.rows[0], id: String(index) })) };
    const stored = encodeTgPayload(large);
    expect(JSON.stringify(stored).length).toBeLessThan(JSON.stringify(large).length / 5);
    expect(decodeTgPayload(stored)).toEqual(large);
  });
  it("rejeita armazenamento incompleto ou corrompido", () => {
    expect(() => decodeTgPayload(null)).toThrow();
    expect(() => decodeTgPayload({ ...report, rows: null })).toThrow();
    expect(() => decodeTgPayload({ ...encodeTgPayload(report), rowsGzip: "invalid" })).toThrow();
  });
});
