import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { classifyMclAiError, runMclAssistant } from "@/modules/ai/agent";
import { mclChatRequestSchema } from "@/modules/ai/contracts";
import { assertMclAiRateLimit } from "@/modules/ai/rate-limit";
import { getRouteActor } from "@/modules/auth/route-actor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
  const actor = await getRouteActor();
  if (!actor) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        error: "Autenticação obrigatória para consultar o Assistente IA.",
        retryable: false,
        requestId,
      },
      { status: 401 },
    );
  }

  try {
    const input = mclChatRequestSchema.parse(await request.json());
    assertMclAiRateLimit(actor.id);
    const response = await runMclAssistant(input, actor, requestId, request.signal);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          code: "INVALID_AI_REQUEST",
          error: "A pergunta, o escopo ou o histórico da conversa são inválidos.",
          details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
          retryable: false,
          requestId,
        },
        { status: 400 },
      );
    }

    const classified = classifyMclAiError(error);
    return NextResponse.json(
      {
        code: classified.code,
        error: classified.message,
        retryable: classified.retryable,
        requestId,
      },
      { status: classified.status },
    );
  }
}
