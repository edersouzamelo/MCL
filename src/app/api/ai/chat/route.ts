import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { classifyMclAiError, runMclAssistant } from "@/modules/ai/agent";
import { runCreditAnalyticsContingency } from "@/modules/ai/credit-analytics";
import { mclChatRequestSchema, type MclChatRequest } from "@/modules/ai/contracts";
import { assertMclAiRateLimit } from "@/modules/ai/rate-limit";
import { getRouteActor } from "@/modules/auth/route-actor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Keep provider payloads, messages, prompts, headers and tokens out of logs.
// Walk wrappers because retries may hide the original HTTP status in cause.
function errorDiagnostics(error: unknown) {
  const seen = new Set<unknown>();
  const entries: Record<string, unknown>[] = [];
  const identifier = (value: unknown) =>
    typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]{0,80}$/.test(value)
      ? value : undefined;
  function visit(value: unknown, depth: number) {
    if (!value || typeof value !== "object" || depth > 4 || seen.has(value) || entries.length >= 8) return;
    seen.add(value);
    const item = value as Record<string, unknown>;
    const message = typeof item.message === "string" ? item.message : "";
    const signals = Object.entries({
      oidc: /oidc|unauthenticated/i,
      missing_oidc_header: /x-vercel-oidc-token.*missing|missing.*x-vercel-oidc-token/i,
      invalid_token: /invalid.*token|token.*invalid|token.*expired|expired.*token/i,
      access_denied: /forbidden|not authorized|permission|access denied/i,
      api_key: /api.key/i,
      routing: /no (available|eligible|matching) provider|routing|no endpoints/i,
      retention: /zero.data.retention|data policy|training/i,
      model: /model.*(not found|not supported|unavailable|invalid)/i,
      schema: /schema|invalid.*(parameter|argument)|unsupported.*(parameter|setting)/i,
      quota: /quota|budget|credit|payment/i,
      timeout: /timeout|timed out|abort/i,
      network: /fetch failed|network|ECONN|ENOTFOUND/i,
    }).filter(([, pattern]) => pattern.test(message)).map(([signal]) => signal);
    entries.push({
      name: identifier(item.name), type: identifier(item.type), code: identifier(item.code),
      statusCode: typeof item.statusCode === "number" ? item.statusCode : undefined,
      signals,
    });
    visit(item.cause, depth + 1);
    visit(item.lastError, depth + 1);
    if (Array.isArray(item.errors)) item.errors.slice(0, 3).forEach((cause) => visit(cause, depth + 1));
  }
  visit(error, 0);
  return entries;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
  const startedAt = Date.now();
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

  let input: MclChatRequest | undefined;
  try {
    input = mclChatRequestSchema.parse(await request.json());
    assertMclAiRateLimit(actor.id);
    console.info(JSON.stringify({
      level: "info",
      message: "Assistente IA iniciou consulta",
      route: "/api/ai/chat",
      requestId,
    }));
    const response = await runMclAssistant(input, actor, requestId, request.signal);
    console.info(JSON.stringify({
      level: "info",
      message: "Assistente IA concluiu consulta",
      route: "/api/ai/chat",
      requestId,
      provider: response.provider,
      durationMs: Date.now() - startedAt,
    }));
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
    if (input && ["AI_GATEWAY_RATE_LIMITED", "AI_GATEWAY_TIMEOUT", "AI_GATEWAY_UNAVAILABLE", "AI_GATEWAY_BUDGET_EXHAUSTED", "AI_EMPTY_RESPONSE"].includes(classified.code)) {
      try {
        const contingency = await runCreditAnalyticsContingency(input, actor, requestId, classified.code);
        if (contingency) {
          console.warn(JSON.stringify({
            level: "warning",
            message: "Assistente IA concluiu consulta financeira pelo motor de contingência",
            route: "/api/ai/chat",
            requestId,
            gatewayCode: classified.code,
            durationMs: Date.now() - startedAt,
          }));
          return NextResponse.json(contingency);
        }
      } catch (contingencyError) {
        console.error(JSON.stringify({
          level: "error",
          message: "Contingência financeira do Assistente falhou",
          route: "/api/ai/chat",
          requestId,
          gatewayCode: classified.code,
          contingencyError: contingencyError instanceof Error ? contingencyError.name : "UnknownError",
        }));
      }
    }
    const diagnostics = errorDiagnostics(error);
    const diagnosticSummary = diagnostics.map((item) =>
      [item.name, item.statusCode, ...(Array.isArray(item.signals) ? item.signals : [])]
        .filter((value) => value !== undefined).join(" / ")
    ).join(" → ");
    console.error(JSON.stringify({
      level: "error",
      message: "Assistente IA falhou",
      route: "/api/ai/chat",
      requestId,
      code: classified.code,
      status: classified.status,
      diagnostics,
    }));
    return NextResponse.json(
      {
        code: classified.code,
        error: `${classified.message} Diagnóstico técnico: ${diagnosticSummary || "indisponível"}.`,
        retryable: classified.retryable,
        requestId,
      },
      { status: classified.status },
    );
  }
}
