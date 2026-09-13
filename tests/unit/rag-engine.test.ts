import { describe, expect, it } from "vitest";
import { retrieveMclKnowledge } from "@/modules/ai/rag-engine";
import {
  buildMclMessages,
  classifyMclAiError,
  isCreditAnalyticsConversation,
} from "@/modules/ai/agent";
import { formatCreditAnalyticsAnswer, resolveCreditAnalyticsIntent } from "@/modules/ai/credit-analytics";
import { getSiloCatalog, projectCreditAnalytics, projectCreditsForAssistant, queryMclData } from "@/modules/ai/silos";
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

  it("não injeta o seletor visual como filtro de uma conversa financeira", () => {
    const messages = buildMclMessages({
      prompt: "mas na ND 339030?",
      scope: "Piloto Classe II",
      history: [
        { role: "user", content: "Quanto de crédito tem o 9 BSUP?" },
        { role: "assistant", content: "Vou consultar os dados do Tesouro Gerencial." },
      ],
    });
    const current = messages.at(-1);

    expect(current).toEqual(expect.objectContaining({ role: "user" }));
    expect(String(current?.content)).toContain("Domínio detectado: Créditos do Tesouro Gerencial");
    expect(String(current?.content)).not.toContain("Piloto Classe II");
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

  it("mantém perguntas e continuações financeiras no domínio analítico de créditos", () => {
    expect(isCreditAnalyticsConversation({
      prompt: "e de cada UG?",
      scope: "Piloto Classe II",
      history: [
        { role: "user", content: "quanto de crédito temos disponível?" },
        { role: "assistant", content: "O crédito disponível total da Grande Unidade é R$ 3.583.901,97." },
      ],
    })).toBe(true);

    expect(isCreditAnalyticsConversation({
      prompt: "mas na ND 339030?",
      scope: "Piloto Classe II",
      history: [
        { role: "user", content: "quanto de crédito temos disponível?" },
        { role: "assistant", content: "O disponível é reconciliado como provisão atualizada menos despesa empenhada." },
        { role: "user", content: "e de cada UG?" },
        { role: "assistant", content: "Não há dados por UG para o escopo Piloto Classe II." },
      ],
    })).toBe(true);
  });

  it("não transforma uma conversa sem contexto financeiro em consulta de créditos", () => {
    expect(isCreditAnalyticsConversation({
      prompt: "e de cada unidade?",
      scope: "Piloto Classe II",
      history: [{ role: "user", content: "Explique a arquitetura do MCL" }],
    })).toBe(false);
  });

  it("filtra crédito por unidade e prefixo de ND sem busca textual composta", () => {
    const projection = {
      snapshot: {
        fileName: "MCL_MESTRE_CREDITOS_V2_TESTE.xlsx",
        importedAt: "2026-09-12T01:00:00.000Z",
        rowCount: 4,
        checksum: "checksum",
      },
      operational: {
        ugOptions: [
          { ug: "160142", om: "9 BATALHAO DE SUPRIMENTO" },
          { ug: "167142", om: "9 BATALHAO DE SUPRIMENTO" },
          { ug: "160136", om: "COMANDO DO 9 GRUPAMENTO LOGISTICO" },
        ],
        ncMovements: [
          { ug: "160142", om: "9 BATALHAO DE SUPRIMENTO", nc: "NC1", date: "2026-01-01", action: "A1", ro: "RO1", purpose: "Material de consumo", pi: "PI-A", nd: "33903023", provisionUpdatedCents: 100_00, provisionReceivedCents: 100_00, provisionGrantedCents: 0, availableCreditCents: 40_00 },
          { ug: "167142", om: "9 BATALHAO DE SUPRIMENTO", nc: "NC2", date: "2026-01-01", action: "A2", ro: "RO2", purpose: "Fardamento", pi: "PI-B", nd: "33903023", provisionUpdatedCents: 50_00, provisionReceivedCents: 50_00, provisionGrantedCents: 0, availableCreditCents: 50_00 },
          { ug: "160136", om: "COMANDO", nc: "NC3", date: "2026-01-01", action: "A3", ro: "RO3", purpose: "Outra unidade", pi: "PI-C", nd: "33903023", provisionUpdatedCents: 999_00, provisionReceivedCents: 999_00, provisionGrantedCents: 0, availableCreditCents: 999_00 },
        ],
        neExecution: [
          { ug: "160142", om: "9 BATALHAO DE SUPRIMENTO", ne: "NE1", year: "2026", date: "2026-01-02", supplier: "Fornecedor", pi: "PI-A", nd: "33903023", ndDescription: "Material", description: "Compra", processNumber: "P1", biddingModality: "Pregão", committedCents: 60_00, committedToLiquidateCents: 40_00, liquidatedCents: 20_00, liquidatedToPayCents: 0, paidCents: 20_00 },
        ],
        rpnpMovements: [],
      },
    } as unknown as TgDashboardProjection;

    const result = projectCreditAnalytics(projection, {
      ug: "9 BSUP",
      nd: "339030",
      groupBy: "UG",
      includeFinalities: true,
    });

    expect(result.filters.matchedUgs.map((item) => item.ug)).toEqual(["160142", "167142"]);
    expect(result.totals).toMatchObject({
      provisionUpdatedCents: 150_00,
      committedCents: 60_00,
      availableCreditCents: 90_00,
      reportedAvailableCreditCents: 90_00,
      availableReconciliationCents: 0,
    });
    expect(result.groups).toHaveLength(2);
    expect(result.finalities.map((item) => item.purpose)).toEqual(["Material de consumo", "Fardamento"]);
  });

  it("resolve a continuação por ND preservando UG e métrica do histórico", () => {
    const intent = resolveCreditAnalyticsIntent({
      prompt: "desse tanto, quanto que era de ND 339039?",
      scope: "Piloto Classe II",
      history: [{ role: "user", content: "Quanto que a UASG do 9 BSUP já empenhou este ano?" }],
    });

    expect(intent).toMatchObject({
      ug: "9 BSUP",
      nd: "339039",
      metric: "COMMITTED",
      groupBy: "UG",
      answerable: true,
    });
  });

  it("transforma busca textual e ranking em consultas estruturadas", () => {
    expect(resolveCreditAnalyticsIntent({
      prompt: "já foi empenhado coturno este ano?",
      scope: "Todos os Dados",
      history: [],
    })).toMatchObject({ metric: "COMMITTED", search: "coturno", groupBy: "NE", answerable: true });

    expect(resolveCreditAnalyticsIntent({
      prompt: "quais empenhos foram os mais caros do 9º BSUP?",
      scope: "Todos os Dados",
      history: [],
    })).toMatchObject({ metric: "COMMITTED", ug: "9 BSUP", groupBy: "NE", sort: "VALUE_DESC", ranking: true });
  });

  it("filtra descrição de empenho e ordena NEs pela métrica solicitada", () => {
    const projection = {
      snapshot: { fileName: "TG.xlsx", importedAt: "2026-09-12T01:00:00.000Z", rowCount: 3, checksum: "checksum" },
      operational: {
        ugOptions: [{ ug: "160142", om: "9 BATALHAO DE SUPRIMENTO" }],
        ncMovements: [],
        neExecution: [
          { id: "a", ug: "160142", om: "9 BATALHAO DE SUPRIMENTO", ne: "2026NE1", year: "2026", date: "2026-01-02", supplier: "A", pi: "PI-A", nd: "33903023", ndDescription: "Uniformes", description: "Aquisição de coturno", processNumber: "P1", biddingModality: "Pregão", committedCents: 90_00, committedToLiquidateCents: 70_00, liquidatedCents: 20_00, liquidatedToPayCents: 0, paidCents: 20_00 },
          { id: "b", ug: "160142", om: "9 BATALHAO DE SUPRIMENTO", ne: "2026NE2", year: "2026", date: "2026-01-03", supplier: "B", pi: "PI-B", nd: "33903916", ndDescription: "Serviços", description: "Manutenção predial", processNumber: "P2", biddingModality: "Pregão", committedCents: 150_00, committedToLiquidateCents: 100_00, liquidatedCents: 50_00, liquidatedToPayCents: 0, paidCents: 50_00 },
        ],
        rpnpMovements: [],
      },
    } as unknown as TgDashboardProjection;

    const search = projectCreditAnalytics(projection, { ug: "9 BSUP", search: "coturno", metric: "COMMITTED", groupBy: "NE" });
    expect(search.totals).toMatchObject({ committedCents: 90_00, metricValueCents: 90_00, neCount: 1 });
    expect(search.groups.map((group) => group.ne)).toEqual(["2026NE1"]);

    const ranking = projectCreditAnalytics(projection, { ug: "9 BSUP", metric: "COMMITTED", groupBy: "NE", sort: "VALUE_DESC" });
    expect(ranking.groups.map((group) => group.ne)).toEqual(["2026NE2", "2026NE1"]);
    expect(formatCreditAnalyticsAnswer(ranking, { metric: "COMMITTED", groupBy: "NE", sort: "VALUE_DESC", ranking: true, answerable: true })).toContain("2026NE2");
  });

  it("reconhece 429 aninhado dentro do erro de retentativa", () => {
    const error = { name: "AI_RetryError", errors: [{ name: "GatewayRateLimitError", statusCode: 429, message: "quota" }] };
    expect(classifyMclAiError(error)).toMatchObject({ code: "AI_GATEWAY_RATE_LIMITED", status: 429, retryable: true });
  });

  it("não apresenta saldo zero quando o filtro de UASG não corresponde", () => {
    const answer = formatCreditAnalyticsAnswer({
      source: { fileName: "TG.xlsx", importedAt: "2026-09-12T01:00:00.000Z" },
      filters: { ug: "unidade inexistente", nd: null, pi: null, search: null, matchedUgs: [] },
      metric: "COMMITTED",
      totals: { metricValueCents: 0, neCount: 0, ncCount: 0 },
      groups: [],
      finalities: [],
    }, { ug: "unidade inexistente", metric: "COMMITTED", ranking: false, answerable: true });

    expect(answer).toContain("Nenhuma UASG corresponde");
    expect(answer).toContain("ausência de correspondência não equivale a saldo zero");
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
