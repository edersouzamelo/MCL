import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { parseCurrentSagPdf, parseRpnPdf } from "@/modules/grupamento/pdf-sag";
import { parseRpnWorkbook } from "@/modules/grupamento/rpn";
import { parseSagWorkbook } from "@/modules/grupamento/sag";
import { appendAuditLog } from "@/server/demo-store";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const PDF_TIMEOUT_MS = 25_000;
const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "xls", "xlsx"]);

function extensionOf(file: File) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

function validateFile(file: FormDataEntryValue | null, label: string): file is File {
  if (!(file instanceof File)) return false;
  if (!ALLOWED_EXTENSIONS.has(extensionOf(file))) return false;
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return false;
  return true;
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

async function parseCurrent(file: File) {
  const buffer = await file.arrayBuffer();
  return extensionOf(file) === "pdf"
    ? withPdfTimeout(parseCurrentSagPdf(buffer, file.name), "Exercício Corrente")
    : parseSagWorkbook(buffer, file.name);
}

async function parseRpn(file: File) {
  const buffer = await file.arrayBuffer();
  return extensionOf(file) === "pdf"
    ? withPdfTimeout(parseRpnPdf(buffer, file.name), "RPNP")
    : parseRpnWorkbook(buffer, file.name);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  }

  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_IMPORT",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: "manual-pair-upload",
      organizationId: session.user.organizationId,
      outcome: "NEGADO",
      reason: "Perfil sem competência demonstrativa para carga SAG no nível Escalão/Grupamento.",
      metadata: { roles },
    });
    return NextResponse.json({ error: "Permissão insuficiente para importar SAG." }, { status: 403 });
  }

  const formData = await request.formData();
  const currentFile = formData.get("currentFile");
  const rpnFile = formData.get("rpnFile");

  if (!(currentFile instanceof File) || !(rpnFile instanceof File)) {
    return NextResponse.json({ error: "Selecione os dois relatórios: Exercício Corrente e RPNP." }, { status: 400 });
  }
  if (!ALLOWED_EXTENSIONS.has(extensionOf(currentFile)) || !ALLOWED_EXTENSIONS.has(extensionOf(rpnFile))) {
    return NextResponse.json({ error: "Formato não suportado. Use PDF (recomendado), XLS ou XLSX nos dois campos." }, { status: 415 });
  }
  if (!validateFile(currentFile, "Exercício Corrente") || !validateFile(rpnFile, "RPNP")) {
    return NextResponse.json({ error: "Um dos arquivos está vazio, inválido ou acima do limite de 20 MB." }, { status: 413 });
  }

  try {
    const [current, rpn] = await Promise.all([parseCurrent(currentFile), parseRpn(rpnFile)]);
    const success = current.rows.length > 0 && rpn.rows.length > 0;

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_PAIR_IMPORT",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: `${currentFile.name} + ${rpnFile.name}`,
      organizationId: session.user.organizationId,
      outcome: success ? "SUCESSO" : "ERRO",
      reason: success
        ? "Par SAG Exercício Corrente + RPNP interpretado deterministicamente."
        : "O par foi recebido, mas pelo menos uma das duas fontes não produziu linhas válidas; publicação recusada.",
      metadata: {
        currentFileName: currentFile.name,
        currentFileSize: currentFile.size,
        currentRowCount: current.rows.length,
        currentWarningCount: current.warnings.length,
        rpnFileName: rpnFile.name,
        rpnFileSize: rpnFile.size,
        rpnRowCount: rpn.rows.length,
        rpnWarningCount: rpn.warnings.length,
        rawFilesPersisted: false,
      },
    });

    if (!success) {
      return NextResponse.json(
        {
          error: "Carga recusada: os dois relatórios precisam ser reconhecidos e conter linhas válidas.",
          currentWarnings: current.warnings,
          rpnWarnings: rpn.warnings,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ current, rpn, importedAt: new Date().toISOString() });
  } catch (error) {
    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_PAIR_IMPORT",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: `${currentFile.name} + ${rpnFile.name}`,
      organizationId: session.user.organizationId,
      outcome: "ERRO",
      reason: "Falha ao interpretar o par SAG Exercício Corrente + RPNP.",
      metadata: {
        currentFileName: currentFile.name,
        rpnFileName: rpnFile.name,
        rawFilesPersisted: false,
        error: error instanceof Error ? error.message : "erro desconhecido",
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao interpretar os relatórios SAG. Nenhum dado foi considerado válido." },
      { status: 400 },
    );
  }
}
