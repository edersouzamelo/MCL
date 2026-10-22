import { gzipSync, gunzipSync } from "node:zlib";
import type { TgReport } from "./parser";

type TgPayload = TgReport & { emailReceivedAt?: string | null };
type StoredTgPayload = Omit<TgPayload, "rows"> & {
  rowsEncoding: "gzip-base64-v1";
  rowsGzip: string;
};

/** Keep every source row while avoiding an 80+ MB JSONB parameter/response. */
export function encodeTgPayload(report: TgPayload): StoredTgPayload {
  const { rows, ...metadata } = report;
  return {
    ...metadata,
    rowsEncoding: "gzip-base64-v1",
    rowsGzip: gzipSync(JSON.stringify(rows)).toString("base64"),
  };
}

/** Older imports keep their original, uncompressed rows array. */
export function decodeTgPayload(value: unknown): TgPayload {
  if (!value || typeof value !== "object") throw new Error("Carga TG persistida incompatível.");
  const stored = value as TgPayload & Partial<StoredTgPayload>;
  if (stored.rowsEncoding === "gzip-base64-v1") {
    if (typeof stored.rowsGzip !== "string") throw new Error("Carga TG comprimida inválida.");
    const { rowsEncoding, rowsGzip, ...metadata } = stored;
    void rowsEncoding;
    const rows: unknown = JSON.parse(gunzipSync(Buffer.from(rowsGzip, "base64")).toString("utf8"));
    if (!Array.isArray(rows)) throw new Error("Carga TG comprimida sem registros válidos.");
    return { ...metadata, rows } as TgPayload;
  }
  if (!Array.isArray(stored.rows)) throw new Error("Carga TG persistida incompatível.");
  return stored;
}
