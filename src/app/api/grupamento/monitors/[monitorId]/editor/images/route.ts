import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { editorAccess } from "@/modules/grupamento/monitor-content/editor-access";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ monitorId: string }> }) {
  const access = await editorAccess((await params).monitorId);
  if (access.error) return access.error;
  if (Number(request.headers.get("content-length")) > 4_000_000) return NextResponse.json({ error: "Use uma imagem de até 3 MB." }, { status: 413 });
  try {
    const form = await request.formData(), file = form.get("file"), sceneId = String(form.get("sceneId") ?? "");
    if (!(file instanceof File) || file.size > 3_000_000 || !file.size) return NextResponse.json({ error: "Use uma imagem PNG, JPEG ou WebP de até 3 MB." }, { status: 400 });
    const scene = await prisma.monitorContentScene.findFirst({ where: { id: sceneId, active: true, import: { organizationId: access.user.organizationId!, monitorId: access.monitorId, status: "APPROVED" } } });
    if (!scene) return NextResponse.json({ error: "Documento publicado não encontrado." }, { status: 404 });
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 24_000_000 });
    const metadata = await image.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new Error("Use PNG, JPEG ou WebP.");
    const data = await image.rotate().resize({ width: 2560, height: 1440, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    const asset = await prisma.monitorContentAsset.create({ data: { id: randomUUID(), importId: scene.importId, fileName: file.name.slice(0, 240) + ".webp", mimeType: "image/webp", data: new Uint8Array(data) } });
    const output = await sharp(data).metadata();
    return NextResponse.json({ assetId: asset.id, width: output.width, height: output.height });
  } catch { return NextResponse.json({ error: "Não foi possível ler a imagem. Use PNG, JPEG ou WebP de até 3 MB." }, { status: 400 }); }
}
