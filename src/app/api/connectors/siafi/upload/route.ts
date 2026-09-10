import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseRpnWorkbook } from "@/modules/grupamento/rpn";
import { parseSagWorkbook } from "@/modules/grupamento/sag";
import { checksumBuffer, persistFinancialImport, type FinancialSourceKind } from "@/modules/financial-snapshots/repository";
import { parseTgWorkbook } from "@/modules/credits-tg/parser";
import { persistTg } from "@/modules/credits-tg/repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function authorized(request: Request) {
  const expected = process.env.MCL_SIAFI_WEBHOOK_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sourceKind(value: FormDataEntryValue | null): FinancialSourceKind | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "CURRENT" || normalized === "RPNP" ? normalized : null;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, error: "Webhook não autorizado." }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = sourceKind(formData.get("sourceKind"));
    const organizationCode = String(formData.get("organizationCode") ?? "").trim();

    if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "Arquivo ausente, vazio ou acima de 20 MB." }, { status: 400 });
    }
    const isTg = formData.get("reportType") === "TG_MASTER_V1";
    if (!kind && !isTg) return NextResponse.json({ success: false, error: "sourceKind deve ser CURRENT ou RPNP." }, { status: 400 });
    if (!organizationCode) return NextResponse.json({ success: false, error: "organizationCode é obrigatório." }, { status: 400 });

    if (isTg && !/^\d{6}$/.test(organizationCode)) return NextResponse.json({ success: false, error: "Informe a UASG com seis dígitos em MCL_ORGANIZATION_CODE." }, { status: 400 });
    const organization = await prisma.organization.findUnique({ where: isTg ? { uasg: organizationCode } : { code: organizationCode }, select: { id: true, code: true, active: true } });
    if (!organization || !organization.active) return NextResponse.json({ success: false, error: isTg ? "UASG não vinculada a uma organização ativa. Vincule a UASG no painel de Créditos." : "Organização não localizada." }, { status: 404 });

    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "xls" && extension !== "xlsx") {
      return NextResponse.json({ success: false, error: "O webhook automático aceita somente XLS/XLSX." }, { status: 415 });
    }

    const buffer = await file.arrayBuffer();
    if (isTg) {
      const report = parseTgWorkbook(buffer, file.name);
      const received = String(formData.get("emailReceivedAt") ?? "");
      if (received && !Number.isFinite(Date.parse(received))) return NextResponse.json({ success: false, error: "Data do e-mail inválida." }, { status: 400 });
      const saved = await persistTg({ organizationId: organization.id, report, buffer, actor: "apps-script", method: "APPS_SCRIPT_TG", emailReceivedAt: received ? new Date(received).toISOString() : null });
      return NextResponse.json({ success: true, source: "TESOURO_GERENCIAL", rowCount: saved.rowCount, checksum: saved.checksum, persistedAt: saved.importedAt.toISOString(), warnings: report.warnings });
    }
    if (!kind) return NextResponse.json({ success: false, error: "Tipo de fonte ausente." }, { status: 400 });
    const parsed = kind === "CURRENT" ? parseSagWorkbook(buffer, file.name) : parseRpnWorkbook(buffer, file.name);
    if (!parsed.rows.length) {
      return NextResponse.json({ success: false, error: "Nenhuma linha financeira válida. A carga não foi persistida.", warnings: parsed.warnings }, { status: 422 });
    }

    const persisted = await persistFinancialImport({
      organizationId: organization.id,
      sourceKind: kind,
      fileName: file.name,
      checksum: checksumBuffer(buffer),
      rowCount: parsed.rows.length,
      payload: parsed,
      warnings: parsed.warnings,
      ingestionMethod: "APPS_SCRIPT",
      importedBy: "apps-script",
    });

    return NextResponse.json({
      success: true,
      organizationCode: organization.code,
      sourceKind: kind,
      fileName: file.name,
      rowCount: parsed.rows.length,
      checksum: persisted.checksum,
      persistedAt: persisted.importedAt.toISOString(),
      warnings: parsed.warnings,
    });
  } catch (error) {
    console.error("Falha na ingestão automática SAG:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Falha interna na ingestão." }, { status: 500 });
  }
}
