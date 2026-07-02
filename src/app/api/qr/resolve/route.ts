import { NextResponse } from "next/server";
import { appendAuditLog, findUnitByQrToken, resolveQrInput } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };
    const token = resolveQrInput(body.code ?? "");
    const unit = findUnitByQrToken(token);

    if (!unit) {
      appendAuditLog({
        actorId: "user-demo-admin",
        action: "QR_REJEITADO",
        resourceType: "LOGISTICS_UNIT",
        resourceId: token,
        outcome: "NEGADO",
        reason: "Token MCL nao localizado.",
        metadata: { token },
      });
      return NextResponse.json({ error: "Token MCL nao localizado." }, { status: 404 });
    }

    appendAuditLog({
      actorId: "user-demo-admin",
      action: "QR_RESOLVIDO",
      resourceType: "LOGISTICS_UNIT",
      resourceId: unit.id,
      organizationId: "org-provedor-alfa",
      outcome: "SUCESSO",
      reason: "QR resolvido por scanner ou entrada manual.",
      metadata: { token },
    });

    return NextResponse.json({
      token: unit.qrToken,
      logisticsUnitId: unit.id,
      persistentCode: unit.persistentCode,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "QR invalido." }, { status: 400 });
  }
}
