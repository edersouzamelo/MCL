import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Role } from "@/modules/domain/types";
import { acquisitionLinkInputSchema, linkNeedToAcquisitionInstrument } from "@/modules/acquisitions/links";
import { authOptions } from "@/modules/auth/options";
import { appendAuditLog, getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const input = acquisitionLinkInputSchema.parse(await request.json());
    const state = getDemoState();
    const result = linkNeedToAcquisitionInstrument(state, input, (session.user.roles ?? []) as Role[], session.user.id);

    appendAuditLog({
      actorId: session.user.id,
      action: result.duplicate ? "AQUISICAO_VINCULO_DUPLICADO" : "AQUISICAO_VINCULO_MANUAL",
      resourceType: "OBJECT_LINK",
      resourceId: result.link.id,
      organizationId: session.user.organizationId,
      outcome: "SUCESSO",
      reason: result.duplicate
        ? "Vinculo manual ja existia."
        : "Necessidade vinculada manualmente a instrumento publico do Compras.gov.br.",
      metadata: {
        needId: input.needId,
        acquisitionInstrumentId: input.acquisitionInstrumentId,
        confidence: input.confidence,
        sourceSystem: result.link.sourceSystem,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vinculo invalido." }, { status: 400 });
  }
}
