import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { parseTgWorkbook } from "@/modules/credits-tg/parser";
import { persistTg } from "@/modules/credits-tg/repository";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.roles?.some(role => ["ADMIN", "LOGISTICS_MANAGER"].includes(role))) return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  if (!session.user.organizationId) return NextResponse.json({ error: "Organização ausente." }, { status: 422 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.xlsx?$/i.test(file.name) || file.size === 0 || file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Envie XLS/XLSX de até 20 MB." }, { status: 400 });
    const buffer = await file.arrayBuffer();
    const report = parseTgWorkbook(buffer, file.name);
    if (form.get("confirm") !== "true") return NextResponse.json({ preview: true, rows: report.rows.length, ugs: [...new Set(report.rows.map(row => row.ug))], warnings: report.warnings });
    const saved = await persistTg({ organizationId: session.user.organizationId, report, buffer, actor: session.user.id, method: "MANUAL_TG" });
    return NextResponse.json({ success: true, checksum: saved.checksum, persistedAt: saved.importedAt.toISOString(), rowCount: saved.rowCount });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao importar TG." }, { status: 422 }); }
}
