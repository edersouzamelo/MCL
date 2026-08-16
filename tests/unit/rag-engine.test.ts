import { describe, expect, it } from "vitest";
import { queryMclRagEngine } from "@/modules/ai/rag-engine";

describe("Motor RAG do Assistente IA MCL", () => {
  it("responde perguntas sobre a Lei 14.133/2021 e travas de carona (Art. 86)", () => {
    const res = queryMclRagEngine("Quais os limites de carona na Lei 14.133?");
    expect(res.answer).toContain("Art. 86");
    expect(res.answer).toContain("50%");
    expect(res.answer).toContain("200%");
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.confidenceScore).toBeGreaterThan(0.9);
  });

  it("responde sobre a situação de estoque e déficit de Coturno", () => {
    const res = queryMclRagEngine("Qual o déficit de coturno no 9º Gpt Log?");
    expect(res.answer).toContain("Coturno Operacional");
    expect(res.answer).toContain("605160");
    expect(res.answer).toContain("80 unidades");
  });

  it("responde sobre o cálculo do Score Multicritério", () => {
    const res = queryMclRagEngine("Como funciona o Score Multicriterio?");
    expect(res.answer).toContain("35 pts");
    expect(res.answer).toContain("30 pts");
    expect(res.answer).toContain("20 pts");
    expect(res.answer).toContain("15 pts");
  });

  it("sintetiza resposta em PNL para qualquer pergunta geral ou saudação", () => {
    const res = queryMclRagEngine("Olá, como você pode me ajudar?");
    expect(res.answer).toContain("Resposta da Inteligência Logística MCL");
    expect(res.suggestedQuestions.length).toBe(3);
  });
});
