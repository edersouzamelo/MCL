import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    connector: "SIAFI / Tesouro Gerencial Auto-Sync",
    status: "ACTIVE",
    lastSyncAt: new Date().toISOString(),
    frequency: "Daily after STN DW Batch Load (00:30 BRT)",
    subscribedReport: "MCL_MESTRE_EXERCICIO_2026",
    autoIngestionTarget: "/api/connectors/siafi/upload",
    targetModules: ["REQUISITANTE", "RPCM", "METAS", "MATRIZ_MCL"],
  });
}
