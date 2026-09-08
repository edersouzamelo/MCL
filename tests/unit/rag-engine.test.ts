import { describe, expect, it } from "vitest";
import { retrieveMclKnowledge } from "@/modules/ai/rag-engine";
import { buildMclMessages, classifyMclAiError } from "@/modules/ai/agent";
import { getSiloCatalog, queryMclData } from "@/modules/ai/silos";
import { assertMclAiRateLimit, resetMclAiRateLimitsForTests } from "@/modules/ai/rate-limit";

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

  it("classifica créditos fixos e SAG somente navegador como silos bloqueados", () => {
    const catalog = getSiloCatalog(true);
    const creditos = catalog.data.silos.find((silo) => silo.id === "CREDITOS");
    const grupamento = catalog.data.silos.find((silo) => silo.id === "GRUPAMENTO");

    expect(creditos?.status).toBe("BLOCKED");
    expect(grupamento?.status).toBe("BLOCKED");
  });

  it("nunca devolve números financeiros quando o silo de créditos é consultado", async () => {
    const result = await queryMclData(
      { id: "actor-1", organizationId: "org-1", roles: ["LOGISTICS_MANAGER"] },
      { silo: "CREDITOS" },
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.data).toEqual({ records: [] });
    expect(result.citations).toEqual([]);
    expect(result.gaps[0]).toContain("Nenhum número financeiro");
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
