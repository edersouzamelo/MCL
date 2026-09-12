import { describe, expect, it } from "vitest";
import { retrieveMclKnowledge } from "@/modules/ai/rag-engine";
import { buildMclMessages, classifyMclAiError } from "@/modules/ai/agent";
import { getSiloCatalog, projectCreditsForAssistant, queryMclData } from "@/modules/ai/silos";
import type { TgDashboardProjection } from "@/modules/credits-tg/repository";
import { assertMclAiRateLimit, resetMclAiRateLimitsForTests } from "@/modules/ai/rate-limit";
import { resolveMclModel } from "@/modules/ai/provider";

describe("RAG e guardrails do Assistente IA MCL", () => {
  it("recupera conhecimento versionado com fonte e sem resposta numérica fabricada", () => {
    const result = retrieveMclKnowledge("Como funciona o Centro de Comando SAG?", 3);

    expect(result.status).toBe("AVAILABLE");
    expect(result.dataNature).toBe("VERSIONED_KNOWLEDGE");
    expect(result.data.chunks.some((chunk) => chunk.id === "command-center")).toBe(true);
    expect(result.citations.every((citation) => citation.source && citation.asOf)).toBe(true);
    expect(JSON.stringify(result)).not.toContain("88.5%");
    expect(JSON.stringify(result)).not.toContain("R$ 142.500");
  });

  it("separa Créditos TG pendente de Grupamento SAG consultável", () => {
    const catalog = getSiloCatalog(true);
    const creditos = catalog.data.silos.find((silo) => silo.id === "CREDITOS");
    const grupamento = catalog.data.silos.find((silo) => silo.id === "GRUPAMENTO");

    expect(creditos?.status).toBe("AVAILABLE");
    expect(grupamento?.status).toBe("AVAILABLE");
    expect(creditos?.nature).toContain("Tesouro Gerencial");
  });

  it("nunca devolve números financeiros quando o banco está indisponível", async () => {
    const result = await queryMclData(
      { id: "actor-1", organizationId: "org-1", roles: ["LOGISTICS_MANAGER"] },
      { silo: "CREDITOS" },
    );

    expect(result.status).toBe("UNAVAILABLE");
    expect(result.data).toEqual({ records: [] });
    expect(result.citations).toEqual([]);
    expect(result.gaps[0]).toContain("DATABASE_URL");
  });

  it("entrega ao RAG totais reconciliados e detalhamento por UASG a partir da projeção compacta", () => {
    const projection = {
      snapshot: {
        fileName: "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx",
        importedAt: "2026-09-12T01:00:00.000Z",
        emailReceivedAt: "2026-09-11T19:41:37.000Z",
        rowCount: 36_773,
        checksum: "checksum",
        warnings: [],
      },
      operational: {
        ugOptions: [
          { ug: "160136", om: "COMANDO DO 9º GRUPAMENTO LOGÍSTICO" },
          { ug: "160142", om: "9º BATALHÃO DE SUPRIMENTO" },
        ],
        ncMovements: [
          { ug: "160136", provisionUpdatedCents: 10_000 },
          { ug: "160142", provisionUpdatedCents: 20_000 },
        ],
        neExecution: [
          { ug: "160136", committedCents: 6_000, liquidatedCents: 4_000, committedToLiquidateCents: 2_000, paidCents: 3_000 },
          { ug: "160142", committedCents: 5_000, liquidatedCents: 2_000, committedToLiquidateCents: 3_000, paidCents: 1_000 },
        ],
        rpnpMovements: [],
      },
    } as unknown as TgDashboardProjection;

    const result = projectCreditsForAssistant(projection, undefined, 10);

    expect(result.totals).toMatchObject({
      provisionUpdatedCents: 30_000,
      committedCents: 11_000,
      availableCreditCents: 19_000,
    });
    expect(result.byUg).toEqual(expect.arrayContaining([
      expect.objectContaining({ ug: "160136", availableCreditCents: 4_000 }),
      expect.objectContaining({ ug: "160142", availableCreditCents: 15_000 }),
    ]));
    expect(JSON.stringify(result)).not.toContain("rows");
  });

  it("mantém o histórico como mensagens tipadas e acrescenta o escopo à pergunta atual", () => {
    const messages = buildMclMessages({
      prompt: "E quais são as lacunas?",
      scope: "Todos os Dados",
      history: [
        { role: "user", content: "Explique o MCL" },
        { role: "assistant", content: "O MCL organiza a continuidade logística." },
      ],
    });

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: "user", content: "Explique o MCL" });
    expect(messages[2]).toEqual({
      role: "user",
      content: "Escopo selecionado na interface: Todos os Dados.\n\nPergunta: E quais são as lacunas?",
    });
  });

  it("mapeia cobrança esgotada do Gateway sem criar fallback textual", () => {
    const error = classifyMclAiError({ statusCode: 402 });

    expect(error.code).toBe("AI_GATEWAY_BUDGET_EXHAUSTED");
    expect(error.status).toBe(503);
    expect(error.message).toContain("Nenhuma resposta substituta");
  });

  it("classifica AbortError como timeout recuperável", () => {
    const error = new Error("The operation was aborted after timeout");
    error.name = "AbortError";

    expect(classifyMclAiError(error)).toMatchObject({
      code: "AI_GATEWAY_TIMEOUT",
      status: 504,
      retryable: true,
    });
  });

  it("deixa o SDK resolver OIDC pelo contexto da requisição, sem bloquear pela ausência no process.env", () => {
    const previousToken = process.env.VERCEL_OIDC_TOKEN;
    delete process.env.VERCEL_OIDC_TOKEN;

    expect(() => resolveMclModel()).not.toThrow();

    if (previousToken) process.env.VERCEL_OIDC_TOKEN = previousToken;
  });

  it("classifica ausência do cabeçalho OIDC reportada pelo SDK como falha de autenticação", () => {
    const error = classifyMclAiError(new Error("The 'x-vercel-oidc-token' header is missing from the request."));

    expect(error.code).toBe("AI_GATEWAY_AUTH_FAILED");
    expect(error.status).toBe(503);
  });

  it("limita o número de chamadas por usuário antes de gerar novos custos", () => {
    resetMclAiRateLimitsForTests();
    for (let index = 0; index < 10; index += 1) {
      expect(() => assertMclAiRateLimit("actor-rate-limit", 1_000)).not.toThrow();
    }

    expect(() => assertMclAiRateLimit("actor-rate-limit", 1_000)).toThrowError(
      expect.objectContaining({ code: "AI_USER_RATE_LIMITED", status: 429 }),
    );
    resetMclAiRateLimitsForTests();
  });
});
