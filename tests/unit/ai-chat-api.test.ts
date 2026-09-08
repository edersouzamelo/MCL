import { beforeEach, describe, expect, it, vi } from "vitest";
import { MclAiServiceError, type RagResponse } from "@/modules/ai/contracts";
import { getRouteActor } from "@/modules/auth/route-actor";
import { runMclAssistant } from "@/modules/ai/agent";
import { POST } from "@/app/api/ai/chat/route";

vi.mock("@/modules/auth/route-actor", () => ({
  getRouteActor: vi.fn(),
}));

vi.mock("@/modules/ai/agent", async () => {
  const actual = await vi.importActual<typeof import("@/modules/ai/agent")>("@/modules/ai/agent");
  return { ...actual, runMclAssistant: vi.fn() };
});

function request(body: unknown) {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "req-ai-test" },
    body: JSON.stringify(body),
  });
}

function authenticatedActor() {
  vi.mocked(getRouteActor).mockResolvedValue({
    id: "user-ai-test",
    organizationId: "org-ai-test",
    roles: ["LOGISTICS_MANAGER"],
  });
}

describe("API Route - /api/ai/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita consulta sem sessão antes de chamar o modelo", async () => {
    vi.mocked(getRouteActor).mockResolvedValue(undefined);

    const response = await POST(request({ prompt: "Explique o MCL" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.requestId).toBe("req-ai-test");
    expect(runMclAssistant).not.toHaveBeenCalled();
  });

  it("valida tamanho e conteúdo da pergunta antes da geração", async () => {
    authenticatedActor();

    const response = await POST(request({ prompt: "   ", history: [] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("INVALID_AI_REQUEST");
    expect(runMclAssistant).not.toHaveBeenCalled();
  });

  it("encaminha prompt, histórico, ator e requestId para o agente", async () => {
    authenticatedActor();
    const agentResponse: RagResponse = {
      answer: "Resposta baseada nas ferramentas.",
      citations: [],
      suggestedQuestions: [],
      warnings: [],
      requestId: "req-ai-test",
      provider: "vercel-ai-gateway",
      model: "openai/gpt-5-mini",
      authMode: "oidc",
    };
    vi.mocked(runMclAssistant).mockResolvedValue(agentResponse);

    const response = await POST(request({
      prompt: "Quais silos estão disponíveis?",
      scope: "Todos os Dados",
      history: [{ role: "user", content: "Explique o MCL" }],
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(agentResponse);
    expect(runMclAssistant).toHaveBeenCalledWith(
      {
        prompt: "Quais silos estão disponíveis?",
        scope: "Todos os Dados",
        history: [{ role: "user", content: "Explique o MCL" }],
      },
      {
        id: "user-ai-test",
        organizationId: "org-ai-test",
        roles: ["LOGISTICS_MANAGER"],
      },
      "req-ai-test",
      expect.any(AbortSignal),
    );
  });

  it("devolve falha de orçamento explícita sem resposta falsa", async () => {
    authenticatedActor();
    vi.mocked(runMclAssistant).mockRejectedValue(
      new MclAiServiceError(
        "AI_GATEWAY_BUDGET_EXHAUSTED",
        "O limite financeiro do AI Gateway foi atingido. Nenhuma resposta substituta foi inventada.",
        503,
      ),
    );

    const response = await POST(request({ prompt: "Explique o MCL" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("AI_GATEWAY_BUDGET_EXHAUSTED");
    expect(body.answer).toBeUndefined();
    expect(body.error).toContain("Nenhuma resposta substituta");
  });
});
