import sharp from "sharp";
import { z } from "zod";
import { createHash } from "node:crypto";
import type { MonitorDocumentAssetDraft } from "../types";

const responseSchema = z.object({ rawHash: z.string().regex(/^[a-f0-9]{64}$/), rendererVersion: z.string().min(1).max(100), pages: z.array(z.object({ page: z.number().int().positive().max(80), png: z.string().max(24_000_000), text: z.string().max(200_000), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(1).max(80) });
export type NativePage = { page: number; asset: MonitorDocumentAssetDraft; sha256: string; text: string; rendererVersion: string };
export type NativeRenderer = (buffer: Buffer, format: "pptx" | "docx" | "pdf") => Promise<NativePage[]>;

export async function renderNativeDocument(buffer: Buffer, format: "pptx" | "docx" | "pdf", fetcher: typeof fetch = fetch): Promise<NativePage[]> {
  const endpoint = process.env.MCL_NATIVE_RENDERER_URL;
  const token = process.env.MCL_NATIVE_RENDERER_TOKEN;
  if (!endpoint && !token) {
    const { renderInSandbox } = await import("./sandbox-renderer");
    return validateNativeResponse(buffer, await renderInSandbox(buffer, format));
  }
  if (!endpoint || !token) throw new Error("Configuração do renderizador nativo incompleta. O original foi preservado.");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname))) throw new Error("Renderizador deve usar HTTPS ou loopback local.");
  const response = await fetcher(new URL("render", url.href.endsWith("/") ? url : new URL(url.href + "/")), {
    method: "POST", headers: { Authorization: "Bearer " + token, "X-MCL-Format": format, "Content-Type": "application/octet-stream" },
    body: new Uint8Array(buffer), signal: AbortSignal.timeout(90_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Renderizador nativo indisponível (${response.status}).`);
  // Limit the stream before JSON parsing, including chunked responses.
  const reader = response.body?.getReader(); if (!reader) throw new Error("Resposta nativa vazia.");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > 68 * 1024 * 1024) throw new Error("Resposta nativa excede o limite seguro."); chunks.push(part.value); }
  } finally { await reader.cancel(); }
  return validateNativeResponse(buffer, JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

export async function validateNativeResponse(buffer: Buffer, response: unknown): Promise<NativePage[]> {
  const value = responseSchema.parse(response);
  const rawHash = createHash("sha256").update(buffer).digest("hex");
  if (value.rawHash !== rawHash) throw new Error("A referência nativa não corresponde ao arquivo original.");
  const pages: NativePage[] = []; let total = 0;
  for (const [index, page] of value.pages.entries()) {
    if (page.page !== index + 1) throw new Error("Páginas nativas ausentes, duplicadas ou fora de ordem.");
    const data = Buffer.from(page.png, "base64"); total += data.length;
    if (total > 48 * 1024 * 1024 || createHash("sha256").update(data).digest("hex") !== page.sha256) throw new Error("Imagem nativa inválida ou acima do limite.");
    const metadata = await sharp(data, { limitInputPixels: 4_000_000 }).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height || Math.max(metadata.width, metadata.height) < 1280) throw new Error("Referência nativa sem resolução suficiente.");
    pages.push({ page: page.page, sha256: page.sha256, text: page.text, rendererVersion: value.rendererVersion,
      asset: { key: "native:" + rawHash + ":" + page.page, fileName: `native-page-${page.page}.png`, mimeType: "image/png", width: metadata.width, height: metadata.height, data } });
  }
  return pages;
}
