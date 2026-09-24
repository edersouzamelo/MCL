import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { saveMonitorUploadChunk } from "@/modules/grupamento/monitor-content/repository";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);
const MAX_CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_CHUNKS = 12;

function validUploadId(value: string) {
  return /^[a-zA-Z0-9-]{12,80}$/.test(value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) return NextResponse.json({ error: "Permissão insuficiente para importar conteúdo documental." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Sessão sem organização." }, { status: 422 });

  const form = await request.formData();
  const uploadId = String(form.get("uploadId") ?? "");
  const monitorId = Number(form.get("monitorId"));
  const chunkIndex = Number(form.get("chunkIndex"));
  const chunkCount = Number(form.get("chunkCount"));
  const fileName = String(form.get("fileName") ?? "");
  const mimeType = String(form.get("mimeType") ?? "application/octet-stream");
  const totalSize = Number(form.get("totalSize"));
  const chunk = form.get("chunk");

  if (!validUploadId(uploadId)) return NextResponse.json({ error: "Identificador de carga inválido." }, { status: 400 });
  if (!Number.isInteger(monitorId) || monitorId < 1 || monitorId > 8) return NextResponse.json({ error: "Monitor inválido." }, { status: 400 });
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_CHUNKS || chunkIndex >= chunkCount) {
    return NextResponse.json({ error: "Sequência de blocos inválida." }, { status: 400 });
  }
  if (!fileName || fileName.length > 240) return NextResponse.json({ error: "Nome de arquivo inválido." }, { status: 400 });
  if (!Number.isInteger(totalSize) || totalSize < 1 || totalSize > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Arquivo excede o limite operacional de 25 MB." }, { status: 413 });
  }
  if (!(chunk instanceof File) || !chunk.size || chunk.size > MAX_CHUNK_BYTES) {
    return NextResponse.json({ error: "Bloco de upload ausente ou maior que 3 MB." }, { status: 413 });
  }

  const data = Buffer.from(await chunk.arrayBuffer());
  await saveMonitorUploadChunk({
    uploadId,
    chunkIndex,
    chunkCount,
    organizationId: session.user.organizationId,
    monitorId,
    fileName,
    mimeType,
    totalSize,
    uploadedBy: session.user.id,
    data,
  });

  return NextResponse.json({ ok: true, uploadId, chunkIndex, chunkCount });
}
