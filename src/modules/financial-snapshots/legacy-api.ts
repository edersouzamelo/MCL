import { NextResponse } from "next/server";

export function legacyFinancialApiDisabled() {
  return NextResponse.json({
    success: false,
    code: "LEGACY_FINANCIAL_API_DISABLED",
    error: "Endpoint legado desativado porque utilizava dados demonstrativos. A reconexão da fonte Tesouro Gerencial do painel de Créditos está pendente.",
    dataNature: "NONE",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
