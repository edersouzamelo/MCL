import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { parseCurrentSagPdf, parseRpnPdf } from "@/modules/grupamento/pdf-sag";
import { mergeRpnImportResults, parseRpnWorkbook, type RpnImportResult } from "@/modules/grupamento/rpn";
import { mergeSagImportResults, parseSagWorkbook, type SagImportResult } from "@/modules/grupamento/sag";
import { familyFieldName, SAG_PI_FAMILIES, type SagPiFamily, validatePiFamilyRows } from "@/modules/grupamento/sag-family-batch";
import { appendAuditLog } from "@/server/demo-store";
import { checksumBuffer, checksumBuffers, persistFinancialPair } from "@/modules/financial-snapshots/repository";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const PDF_TIMEOUT_MS = 25_000;
const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "xls", "xlsx"]);

type ParsedFamily<T> = {
  family: SagPiFamily;
  file: File;
  buffer: ArrayBuffer;
  parsed: T;
};

function extensionOf(file: File) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

function validateFile(file: FormDataEntryValue | null): file is File {
  if (!(file instanceof File)) return false;
  if (!ALLOWED_EXTENSIONS.has(extensionOf(file))) return false;
  return file.size > 0 && file.size <= MAX_FILE_SIZE;
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

async function parseCurrent(file: File, label = "Exercício Corrente") {
  const buffer = await file.arrayBuffer();
  const parsed = extensionOf(file) === "pdf"
    ? withPdfTimeout(parseCurrentSagPdf(buffer, file.name), label)
    : parseSagWorkbook(buffer, file.name);
  return { parsed: await parsed, buffer };
}

async function parseRpn(file: File, label = "RPNP") {
  const buffer = await file.arrayBuffer();
  const parsed = extensionOf(file) === "pdf"
    ? withPdfTimeout(parseRpnPdf(buffer, file.name), label)
    : parseRpnWorkbook(buffer, file.name);
  return { parsed: await parsed, buffer };
}

function familyError(label: string, family: SagPiFamily, parsed: SagImportResult | RpnImportResult) {
  const validation = validatePiFamilyRows(parsed.rows, family);
  if (validation.valid) return null;
  if (!validation.rowCount) return `${label} ${family}: nenhuma linha financeira válida foi encontrada.`;
  if (validation.missingPi) {
    return `${label} ${family}: ${validation.missingPi} linha(s) sem PI. Refaça a consulta incluindo UASG, NOME UG e PI nos campos de identificação.`;
  }
  return `${label} ${family}: o arquivo contém PI fora da família esperada (${validation.mismatched.slice(0, 5).join(", ")}).`;
}

function familyMetadata<T extends SagImportResult | RpnImportResult>(parts: Array<ParsedFamily<T>>) {
  return parts.map((part) => ({
    family: part.family,
    fileName: part.file.name,
    rowCount: part.parsed.rows.length,
  }));
}

function familyAuditMetadata<T extends SagImportResult | RpnImportResult>(parts: Array<ParsedFamily<T>>) {
  return parts.map((part) => ({
    family: part.family,
    fileName: part.file.name,
    fileSize: part.file.size,
    rowCount: part.parsed.rows.length,
    warningCount: part.parsed.warnings.length,
  }));
}

async function parseFamilyBatch(formData: FormData) {
  const currentParts: Array<ParsedFamily<SagImportResult>> = [];
  const rpnParts: Array<ParsedFamily<RpnImportResult>> = [];

  for (const family of SAG_PI_FAMILIES) {
    const file = formData.get(familyFieldName("current", family));
    if (!validateFile(file)) {
      throw new Error(`Exercício Corrente ${family}: arquivo ausente, inválido, não suportado ou acima de 20 MB.`);
    }
    const source = await parseCurrent(file, `Exercício Corrente ${family}`);
    const error = familyError("Exercício Corrente", family, source.parsed);
    if (error) throw new Error(error);
    currentParts.push({ family, file, buffer: source.buffer, parsed: source.parsed });
  }

  for (const family of SAG_PI_FAMILIES) {
    const file = formData.get(familyFieldName("rpn", family));
    if (!validateFile(file)) {
      throw new Error(`RPNP ${family}: arquivo ausente, inválido, não suportado ou acima de 20 MB.`);
    }
    const source = await parseRpn(file, `RPNP ${family}`);
    const error = familyError("RPNP", family, source.parsed);
    if (error) throw new Error(error);
    rpnParts.push({ family, file, buffer: source.buffer, parsed: source.parsed });
  }

  return { currentParts, rpnParts };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];

  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });

  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_IMPORT",
      resourceType: "GRUPAMENTO_CCOL",
      resourceId: "manual-upload",
      organizationId: session.user.organizationId,
      outcome: "NEGADO",
      reason: "Perfil sem competência demonstrativa para carga SAG no nível Escalão/Grupamento.",
      metadata: { roles },
    });
    return NextResponse.json({ error: "Permissão insuficiente para importar SAG." }, { status: 403 });
  }

  const formData = await request.formData();
  const anyFamilyField = SAG_PI_FAMILIES.some(
    (family) => formData.has(familyFieldName("current", family)) || formData.has(familyFieldName("rpn", family)),
  );
  const allFamilyFields = SAG_PI_FAMILIES.every(
    (family) => formData.get(familyFieldName("current", family)) instanceof File && formData.get(familyFieldName("rpn", family)) instanceof File,
  );

  if (anyFamilyField && !allFamilyFields) {
    return NextResponse.json({
      error: "Carga incompleta: selecione os 8 relatórios SAG, com E5, E6, E7 e D8 para Exercício Corrente e RPNP.",
    }, { status: 400 });
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Sessão sem organização. A carga não foi persistida." }, { status: 422 });
  }

  if (allFamilyFields) {
    try {
      const { currentParts, rpnParts } = await parseFamilyBatch(formData);
      const current = mergeSagImportResults(
        currentParts.map((part) => part.parsed),
        "Exercício Corrente · 4 PDFs (E5, E6, E7, D8)",
        familyMetadata(currentParts),
      );
      const rpn = mergeRpnImportResults(
        rpnParts.map((part) => part.parsed),
        "RPNP · 4 PDFs (E5, E6, E7, D8)",
        familyMetadata(rpnParts),
      );

      appendAuditLog({
        actorId: session.user.id,
        action: "SAG_FAMILY_BATCH_IMPORT",
        resourceType: "GRUPAMENTO_CCOL",
        resourceId: "E5+E6+E7+D8",
        organizationId,
        outcome: "SUCESSO",
        reason: "Lote SAG de 8 arquivos interpretado e consolidado deterministicamente em Exercício Corrente + RPNP.",
        metadata: {
          current: familyAuditMetadata(currentParts),
          rpn: familyAuditMetadata(rpnParts),
          currentRowCount: current.rows.length,
          rpnRowCount: rpn.rows.length,
          rawFilesPersisted: false,
        },
      });

      const [currentImport, rpnImport] = await persistFinancialPair(
        {
          organizationId,
          sourceKind: "CURRENT",
          fileName: current.source.fileName,
          checksum: checksumBuffers(currentParts.map((part) => part.buffer)),
          rowCount: current.rows.length,
          payload: current,
          warnings: current.warnings,
          ingestionMethod: "MANUAL_FAMILY_BATCH",
          importedBy: session.user.id,
        },
        {
          organizationId,
          sourceKind: "RPNP",
          fileName: rpn.source.fileName,
          checksum: checksumBuffers(rpnParts.map((part) => part.buffer)),
          rowCount: rpn.rows.length,
          payload: rpn,
          warnings: rpn.warnings,
          ingestionMethod: "MANUAL_FAMILY_BATCH",
          importedBy: session.user.id,
        },
      );

      return NextResponse.json({
        current: { ...current, persistedAt: currentImport.importedAt.toISOString(), checksum: currentImport.checksum },
        rpn: { ...rpn, persistedAt: rpnImport.importedAt.toISOString(), checksum: rpnImport.checksum },
        importedAt: new Date().toISOString(),
        persisted: true,
        mode: "FAMILY_BATCH",
      });
    } catch (error) {
      appendAuditLog({
        actorId: session.user.id,
        action: "SAG_FAMILY_BATCH_IMPORT",
        resourceType: "GRUPAMENTO_CCOL",
        resourceId: "E5+E6+E7+D8",
        organizationId,
        outcome: "ERRO",
        reason: "Falha ao interpretar ou validar o lote SAG dividido por família de PI.",
        metadata: { rawFilesPersisted: false, error: error instanceof Error ? error.message : "erro desconhecido" },
      });
      return NextResponse.json({
        error: error instanceof Error ? error.message : "Falha ao interpretar o lote SAG. Nenhum dado foi considerado válido.",
      }, { status: 400 });
    }
  }

  const currentFile = formData.get("currentFile");
  const rpnFile = formData.get("rpnFile");

  if (!(currentFile instanceof File) || !(rpnFile instanceof File)) {
    return NextResponse.json({
      error: "Selecione os 8 relatórios por família. A compatibilidade antiga de 2 arquivos só funciona quando currentFile e rpnFile são enviados explicitamente.",
    }, { status: 400 });
  }
  if (!ALLOWED_EXTENSIONS.has(extensionOf(currentFile)) || !ALLOWED_EXTENSIONS.has(extensionOf(rpnFile))) {
    return NextResponse.json({ error: "Formato não suportado. Use PDF (recomendado), XLS ou XLSX." }, { status: 415 });
  }
  if (!validateFile(currentFile) || !validateFile(rpnFile)) {
    return NextResponse.json({ error: "Um dos arquivos está vazio, inválido ou acima do limite de 20 MB." }, { status: 413 });
  }

  try {
    const currentSource = await parseCurrent(currentFile);
    const rpnSource = await parseRpn(rpnFile);
    const current = currentSource.parsed;
    const rpn = rpnSource.parsed;
    const success = current.rows.length > 0 && rpn.rows.length > 0;

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_PAIR_IMPORT",
      resourceType: "GRUPAMENTO_CCOL",
      resourceId: `${currentFile.name} + ${rpnFile.name}`,
      organizationId,
      outcome: success ? "SUCESSO" : "ERRO",
      reason: success
        ? "Par SAG legado Exercício Corrente + RPNP interpretado deterministicamente."
        : "O par legado foi recebido, mas pelo menos uma das fontes não produziu linhas válidas; publicação recusada.",
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
      return NextResponse.json({
        error: "Carga recusada: os dois relatórios precisam ser reconhecidos e conter linhas válidas.",
        currentWarnings: current.warnings,
        rpnWarnings: rpn.warnings,
      }, { status: 422 });
    }

    const [currentImport, rpnImport] = await persistFinancialPair(
      {
        organizationId,
        sourceKind: "CURRENT",
        fileName: currentFile.name,
        checksum: checksumBuffer(currentSource.buffer),
        rowCount: current.rows.length,
        payload: current,
        warnings: current.warnings,
        ingestionMethod: "MANUAL_PAIR",
        importedBy: session.user.id,
      },
      {
        organizationId,
        sourceKind: "RPNP",
        fileName: rpnFile.name,
        checksum: checksumBuffer(rpnSource.buffer),
        rowCount: rpn.rows.length,
        payload: rpn,
        warnings: rpn.warnings,
        ingestionMethod: "MANUAL_PAIR",
        importedBy: session.user.id,
      },
    );

    return NextResponse.json({
      current: { ...current, persistedAt: currentImport.importedAt.toISOString(), checksum: currentImport.checksum },
      rpn: { ...rpn, persistedAt: rpnImport.importedAt.toISOString(), checksum: rpnImport.checksum },
      importedAt: new Date().toISOString(),
      persisted: true,
      mode: "LEGACY_PAIR",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Falha ao interpretar os relatórios SAG. Nenhum dado foi considerado válido.",
    }, { status: 400 });
  }
}
