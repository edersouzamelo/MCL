import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { parseCurrentSagPdf, parseRpnPdf } from "@/modules/grupamento/pdf-sag";
import { parseRpnWorkbook, type RpnImportResult } from "@/modules/grupamento/rpn";
import { parseSagWorkbook, type SagImportResult } from "@/modules/grupamento/sag";
import { SAG_PI_FAMILIES, type SagPiFamily, validateCombinedPiRows, validatePiFamilyRows } from "@/modules/grupamento/sag-family-batch";
import { appendAuditLog } from "@/server/demo-store";
import { checksumBuffer, replaceSagBatchPart, type FinancialSourceKind } from "@/modules/financial-snapshots/repository";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const PDF_TIMEOUT_MS = 25_000;
const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "xls", "xlsx"]);

function extensionOf(file: File) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

function validBatchId(value: string) {
  return /^[a-zA-Z0-9-]{12,80}$/.test(value);
}

async function withPdfTimeout<T>(promise: Promise<T>, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}: extração PDF excedeu ${PDF_TIMEOUT_MS / 1000}s.`)), PDF_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    return NextResponse.json({ error: "Permissão insuficiente para importar SAG." }, { status: 403 });
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: "Sessão sem organização. A carga não foi persistida." }, { status: 422 });
  }

  const formData = await request.formData();
  const batchId = String(formData.get("batchId") ?? "");
  const source = String(formData.get("source") ?? "").toUpperCase();
  const family = String(formData.get("family") ?? "").toUpperCase();
  const file = formData.get("file");

  if (!validBatchId(batchId)) return NextResponse.json({ error: "Identificador de lote inválido." }, { status: 400 });
  if (source !== "CURRENT" && source !== "RPNP") return NextResponse.json({ error: "Fonte SAG inválida." }, { status: 400 });
  if (family !== "ALL" && !SAG_PI_FAMILIES.includes(family as SagPiFamily)) return NextResponse.json({ error: "Família de PI inválida." }, { status: 400 });
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: `${source} ${family}: arquivo ausente ou vazio.` }, { status: 400 });
  if (!ALLOWED_EXTENSIONS.has(extensionOf(file))) return NextResponse.json({ error: `${source} ${family}: formato não suportado.` }, { status: 415 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({
      error: `${source} ${family}: o arquivo tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite seguro por envio é 4 MB. Reduza ainda mais o escopo no SAG antes de importar.`,
    }, { status: 413 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const sourceKind = source as FinancialSourceKind;
    const parsed: SagImportResult | RpnImportResult = sourceKind === "CURRENT"
      ? (extensionOf(file) === "pdf"
          ? await withPdfTimeout(parseCurrentSagPdf(buffer, file.name), `Exercício Corrente ${family}`)
          : parseSagWorkbook(buffer, file.name))
      : (extensionOf(file) === "pdf"
          ? await withPdfTimeout(parseRpnPdf(buffer, file.name), `RPNP ${family}`)
          : parseRpnWorkbook(buffer, file.name));

    const validation = family === "ALL"
      ? validateCombinedPiRows(parsed.rows)
      : validatePiFamilyRows(parsed.rows, family as SagPiFamily);
    if (!validation.valid) {
      const detail = !validation.rowCount
        ? "nenhuma linha financeira válida foi encontrada"
        : validation.missingPi
          ? `${validation.missingPi} linha(s) sem PI; inclua UASG, NOME UG e PI no primeiro parâmetro do relatório`
          : family === "ALL"
            ? `há PI fora das famílias E5/E6/E7/D8: ${validation.unexpected.slice(0, 5).join(", ")}`
            : `há PI fora da família ${family}: ${validation.mismatched.slice(0, 5).join(", ")}`;
      return NextResponse.json({ error: `${sourceKind} ${family}: ${detail}.` }, { status: 422 });
    }

    const persisted = await replaceSagBatchPart({
      organizationId: session.user.organizationId,
      batchId,
      sourceKind,
      family,
      fileName: file.name,
      checksum: checksumBuffer(buffer),
      rowCount: parsed.rows.length,
      payload: parsed,
      warnings: parsed.warnings,
      importedBy: session.user.id,
    });

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_FAMILY_PART_IMPORT",
      resourceType: "GRUPAMENTO_CCOL",
      resourceId: `${batchId}:${sourceKind}:${family}`,
      organizationId: session.user.organizationId,
      outcome: "SUCESSO",
      reason: family === "ALL"
        ? "Arquivo SAG integral interpretado e armazenado como fonte completa de lote pendente."
        : "Arquivo SAG de uma família de PI interpretado e armazenado como parte de lote pendente.",
      metadata: {
        batchId,
        sourceKind,
        family,
        fileName: file.name,
        fileSize: file.size,
        rowCount: parsed.rows.length,
        warningCount: parsed.warnings.length,
        checksum: persisted.checksum,
        rawFilePersisted: false,
      },
    });

    return NextResponse.json({
      ok: true,
      batchId,
      sourceKind,
      family,
      fileName: file.name,
      rowCount: parsed.rows.length,
      warningCount: parsed.warnings.length,
      checksum: persisted.checksum,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Falha ao interpretar a parte SAG.",
    }, { status: 400 });
  }
}
