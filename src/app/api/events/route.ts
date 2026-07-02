import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Role } from "@/modules/domain/types";
import { createLogisticsEvent } from "@/modules/events/service";
import { authOptions } from "@/modules/auth/options";
import { appendAuditLog, getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    appendAuditLog({
      actorId: "anonymous",
      action: "EVENTO_CRIAR",
      resourceType: "LOGISTICS_EVENT",
      resourceId: "unknown",
      outcome: "NEGADO",
      reason: "Usuario anonimo nao pode registrar evento.",
      metadata: {},
    });
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const input = await request.json();
    const state = getDemoState();
    const result = createLogisticsEvent(
      state,
      { ...input, actorId: session.user.id },
      (session.user.roles as Role[] | undefined) ?? ["READ_ONLY"],
    );

    appendAuditLog({
      actorId: session.user.id,
      action: result.duplicate ? "EVENTO_DUPLICADO" : "EVENTO_CRIADO",
      resourceType: "LOGISTICS_EVENT",
      resourceId: result.event.id,
      organizationId: session.user.organizationId,
      outcome: "SUCESSO",
      reason: result.duplicate ? "Idempotency key ja processada." : "Evento logistico registrado.",
      metadata: { eventType: result.event.eventType, idempotencyKey: result.event.idempotencyKey },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Evento invalido." }, { status: 400 });
  }
}
