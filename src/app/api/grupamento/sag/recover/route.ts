import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/modules/auth/options";
import { recoverLegacySagPair } from "@/modules/grupamento/legacy-sag-recovery";
import { appendAuditLog } from "@/server/demo-store";
import { persistFinancialPair } from "@/modules/financial-snapshots/repository";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);

function checksumPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];

  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    return NextResponse.json({ error: "Permissão insuficiente para recuperar a carga SAG." }, { status: 403 });
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: "Sessão sem organização. A recuperação não foi persistida." }, { status: 422 });
  }

  try {
    const body = await request.json() as { current?: unknown; rpn?: unknown };
    if (!body.current || !body.rpn) {
      return NextResponse.json({ error: "A recuperação exige os dois snapshots locais: Exercício Corrente e créditos do exercício anterior." }, { status: 400 });
    }

    const { current, rpn } = recoverLegacySagPair({ current: body.current, rpn: body.rpn });
    const [currentImport, rpnImport] = await persistFinancialPair(
      {
        organizationId: session.user.organizationId,
        sourceKind: "CURRENT",
        fileName: current.source.fileName,
        checksum: checksumPayload(current),
        rowCount: current.rows.length,
        payload: current,
        warnings: current.warnings,
        ingestionMethod: "LEGACY_BROWSER_RECOVERY",
        importedBy: session.user.id,
      },
      {
        organizationId: session.user.organizationId,
        sourceKind: "RPNP",
        fileName: rpn.source.fileName,
        checksum: checksumPayload(rpn),
        rowCount: rpn.rows.length,
        payload: rpn,
        warnings: rpn.warnings,
        ingestionMethod: "LEGACY_BROWSER_RECOVERY",
        importedBy: session.user.id,
      },
    );

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_LEGACY_BROWSER_RECOVERY",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: `${current.source.fileName} + ${rpn.source.fileName}`,
      organizationId: session.user.organizationId,
      outcome: "SUCESSO",
      reason: "Snapshots SAG legados recuperados do armazenamento local e persistidos sem reler os arquivos-fonte.",
      metadata: {
        currentFileName: current.source.fileName,
        currentOriginalImportedAt: current.source.importedAt,
        currentRowCount: current.rows.length,
        rpnFileName: rpn.source.fileName,
        rpnOriginalImportedAt: rpn.source.importedAt,
        rpnRowCount: rpn.rows.length,
        ingestionMethod: "LEGACY_BROWSER_RECOVERY",
        checksumBasis: "NORMALIZED_PARSED_SNAPSHOT_JSON",
        rawFilesRead: false,
        localCopyDeleted: false,
      },
    });

    return NextResponse.json({
      current: { ...current, persistedAt: currentImport.importedAt.toISOString(), checksum: currentImport.checksum },
      rpn: { ...rpn, persistedAt: rpnImport.importedAt.toISOString(), checksum: rpnImport.checksum },
      importedAt: new Date().toISOString(),
      persisted: true,
      recoveryMethod: "LEGACY_BROWSER_RECOVERY",
    });
  } catch (error) {
    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_LEGACY_BROWSER_RECOVERY",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: "legacy-browser-pair",
      organizationId: session.user.organizationId,
      outcome: "ERRO",
      reason: "Snapshot local legado inválido ou falha na persistência.",
      metadata: {
        ingestionMethod: "LEGACY_BROWSER_RECOVERY",
        error: error instanceof Error ? error.message : "erro desconhecido",
      },
    });

    if (error instanceof ZodError) {
      return NextResponse.json({ error: "A carga local encontrada não corresponde ao contrato SAG legado esperado pelo MCL." }, { status: 422 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao recuperar a carga SAG legada." }, { status: 400 });
  }
}
