import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/modules/auth/options";
import { SAG_PI_FAMILIES } from "@/modules/grupamento/sag-family-batch";
import { mergeSagImportResults, type SagImportResult } from "@/modules/grupamento/sag";
import { mergeRpnImportResults, type RpnImportResult } from "@/modules/grupamento/rpn";
import {
  deleteSagBatchParts,
  getSagBatchParts,
  persistFinancialPair,
  sagBatchPartSourceKind,
} from "@/modules/financial-snapshots/repository";
import { appendAuditLog } from "@/server/demo-store";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER"]);

function validBatchId(value: string) {
  return /^[a-zA-Z0-9-]{12,80}$/.test(value);
}

function asPayload<T>(value: Prisma.JsonValue) {
  return value as unknown as T;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];
  if (!session?.user?.id) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    return NextResponse.json({ error: "Permissão insuficiente para consolidar SAG." }, { status: 403 });
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: "Sessão sem organização. A carga não foi persistida." }, { status: 422 });
  }

  const body = await request.json().catch(() => null) as { batchId?: string } | null;
  const batchId = String(body?.batchId ?? "");
  if (!validBatchId(batchId)) return NextResponse.json({ error: "Identificador de lote inválido." }, { status: 400 });

  const parts = await getSagBatchParts(session.user.organizationId, batchId);
  const byKind = new Map(parts.map((part) => [part.sourceKind, part]));

  function resolveSource(sourceKind: "CURRENT" | "RPNP") {
    const all = byKind.get(sagBatchPartSourceKind(batchId, sourceKind, "ALL"));
    const familyRows = SAG_PI_FAMILIES
      .map((family) => ({
        family,
        row: byKind.get(sagBatchPartSourceKind(batchId, sourceKind, family)),
      }))
      .filter((item) => Boolean(item.row));

    if (all && familyRows.length) {
      return { error: `${sourceKind}: lote ambíguo; há arquivo integral e arquivos fracionados ao mesmo tempo.` } as const;
    }
    if (all) {
      return { mode: "single" as const, all };
    }
    if (familyRows.length !== SAG_PI_FAMILIES.length) {
      const missing = SAG_PI_FAMILIES.filter(
        (family) => !byKind.has(sagBatchPartSourceKind(batchId, sourceKind, family)),
      );
      return { error: `${sourceKind}: faltam ${missing.length} família(s): ${missing.join(", ")}.` } as const;
    }
    return {
      mode: "family" as const,
      familyRows: familyRows as Array<{ family: (typeof SAG_PI_FAMILIES)[number]; row: NonNullable<(typeof familyRows)[number]["row"]> }>,
    };
  }

  const currentSource = resolveSource("CURRENT");
  const rpnSource = resolveSource("RPNP");
  if ("error" in currentSource || "error" in rpnSource) {
    return NextResponse.json({
      error: [("error" in currentSource ? currentSource.error : null), ("error" in rpnSource ? rpnSource.error : null)].filter(Boolean).join(" "),
    }, { status: 409 });
  }

  const current = currentSource.mode === "single"
    ? asPayload<SagImportResult>(currentSource.all.payload)
    : mergeSagImportResults(
        currentSource.familyRows.map((part) => asPayload<SagImportResult>(part.row.payload)),
        "Exercício Corrente · 4 PDFs (E5, E6, E7, D8)",
        currentSource.familyRows.map((part) => ({ family: part.family, fileName: part.row.fileName, rowCount: part.row.rowCount })),
      );

  const rpn = rpnSource.mode === "single"
    ? asPayload<RpnImportResult>(rpnSource.all.payload)
    : mergeRpnImportResults(
        rpnSource.familyRows.map((part) => asPayload<RpnImportResult>(part.row.payload)),
        "RPNP · 4 PDFs (E5, E6, E7, D8)",
        rpnSource.familyRows.map((part) => ({ family: part.family, fileName: part.row.fileName, rowCount: part.row.rowCount })),
      );

  const currentChecksum = currentSource.mode === "single"
    ? currentSource.all.checksum
    : currentSource.familyRows.map((part) => part.row.checksum).join(":");
  const rpnChecksum = rpnSource.mode === "single"
    ? rpnSource.all.checksum
    : rpnSource.familyRows.map((part) => part.row.checksum).join(":");

  try {
    const [currentImport, rpnImport] = await persistFinancialPair(
      {
        organizationId: session.user.organizationId,
        sourceKind: "CURRENT",
        fileName: current.source.fileName,
        checksum: currentChecksum,
        rowCount: current.rows.length,
        payload: current,
        warnings: current.warnings,
        ingestionMethod: "MANUAL_HYBRID_BATCH",
        importedBy: session.user.id,
      },
      {
        organizationId: session.user.organizationId,
        sourceKind: "RPNP",
        fileName: rpn.source.fileName,
        checksum: rpnChecksum,
        rowCount: rpn.rows.length,
        payload: rpn,
        warnings: rpn.warnings,
        ingestionMethod: "MANUAL_HYBRID_BATCH",
        importedBy: session.user.id,
      },
    );

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_HYBRID_BATCH_FINALIZE",
      resourceType: "GRUPAMENTO_CCOL",
      resourceId: batchId,
      organizationId: session.user.organizationId,
      outcome: "SUCESSO",
      reason: "Fontes SAG validadas em modo integral ou fracionado e consolidadas deterministicamente em duas fontes lógicas.",
      metadata: {
        batchId,
        currentMode: currentSource.mode,
        rpnMode: rpnSource.mode,
        currentFiles: current.source.files ?? [{ family: "ALL", fileName: current.source.fileName, rowCount: current.rows.length }],
        rpnFiles: rpn.source.files ?? [{ family: "ALL", fileName: rpn.source.fileName, rowCount: rpn.rows.length }],
        currentRowCount: current.rows.length,
        rpnRowCount: rpn.rows.length,
      },
    });

    await deleteSagBatchParts(session.user.organizationId, batchId);

    return NextResponse.json({
      current: { ...current, persistedAt: currentImport.importedAt.toISOString(), checksum: currentImport.checksum },
      rpn: { ...rpn, persistedAt: rpnImport.importedAt.toISOString(), checksum: rpnImport.checksum },
      importedAt: new Date().toISOString(),
      persisted: true,
      mode: "HYBRID_BATCH_STAGED",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Falha ao consolidar o lote SAG.",
    }, { status: 500 });
  }
}
