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
  const expectedKinds = [
    ...SAG_PI_FAMILIES.map((family) => sagBatchPartSourceKind(batchId, "CURRENT", family)),
    ...SAG_PI_FAMILIES.map((family) => sagBatchPartSourceKind(batchId, "RPNP", family)),
  ];
  const byKind = new Map(parts.map((part) => [part.sourceKind, part]));
  const missing = expectedKinds.filter((kind) => !byKind.has(kind));
  if (missing.length) {
    return NextResponse.json({
      error: `Lote incompleto: faltam ${missing.length} arquivo(s).`,
      missing: missing.map((kind) => kind.split(":").slice(-2).join(" ")),
    }, { status: 409 });
  }

  const currentParts = SAG_PI_FAMILIES.map((family) => {
    const row = byKind.get(sagBatchPartSourceKind(batchId, "CURRENT", family))!;
    return {
      family,
      row,
      payload: asPayload<SagImportResult>(row.payload),
    };
  });
  const rpnParts = SAG_PI_FAMILIES.map((family) => {
    const row = byKind.get(sagBatchPartSourceKind(batchId, "RPNP", family))!;
    return {
      family,
      row,
      payload: asPayload<RpnImportResult>(row.payload),
    };
  });

  const current = mergeSagImportResults(
    currentParts.map((part) => part.payload),
    "Exercício Corrente · 4 PDFs (E5, E6, E7, D8)",
    currentParts.map((part) => ({ family: part.family, fileName: part.row.fileName, rowCount: part.row.rowCount })),
  );
  const rpn = mergeRpnImportResults(
    rpnParts.map((part) => part.payload),
    "RPNP · 4 PDFs (E5, E6, E7, D8)",
    rpnParts.map((part) => ({ family: part.family, fileName: part.row.fileName, rowCount: part.row.rowCount })),
  );

  const currentChecksum = currentParts.map((part) => part.row.checksum).join(":");
  const rpnChecksum = rpnParts.map((part) => part.row.checksum).join(":");

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
        ingestionMethod: "MANUAL_FAMILY_BATCH",
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
        ingestionMethod: "MANUAL_FAMILY_BATCH",
        importedBy: session.user.id,
      },
    );

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_FAMILY_BATCH_FINALIZE",
      resourceType: "GRUPAMENTO_CCOL",
      resourceId: batchId,
      organizationId: session.user.organizationId,
      outcome: "SUCESSO",
      reason: "Oito partes SAG validadas e consolidadas deterministicamente em duas fontes lógicas.",
      metadata: {
        batchId,
        currentFiles: current.source.files,
        rpnFiles: rpn.source.files,
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
      mode: "FAMILY_BATCH_STAGED",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Falha ao consolidar o lote SAG.",
    }, { status: 500 });
  }
}
