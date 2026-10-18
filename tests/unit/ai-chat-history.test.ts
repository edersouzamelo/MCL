import { describe, expect, it } from "vitest";
import {
  AI_HISTORY_MAX_MESSAGES,
  AI_HISTORY_MESSAGE_LIMIT,
  buildBoundedMclHistory,
} from "@/modules/ai/chat-history";
import { mclChatRequestSchema } from "@/modules/ai/contracts";

describe("Histórico do Assistente MCL após respostas financeiras extensas", () => {
  it("mantém a resposta longa visível no chat e transmite contexto válido para nova pergunta", () => {
    const originalAnswer =
      "Na UG/UASG 160136 há 1210 NC.\n" +
      Array.from({ length: 25 }, (_, index) =>
        (index + 1) + ". NC 2026NC" + String(index + 1).padStart(6, "0") +
        " | Provisão atualizada | PI: E6SUPLJA2QS | ND: 339030-9 | Finalidade: " +
        "Descrição documental de finalidade e prazo. ".repeat(14)).join("\n") +
      "\nConciliação do crédito disponível: R$ 3.031.367,21. Fonte: MCL_MESTRE_CREDITOS_V2_TESTE.xlsx.";
    expect(originalAnswer.length).toBeGreaterThan(AI_HISTORY_MESSAGE_LIMIT);
    const history = buildBoundedMclHistory([
      { sender: "user", text: "Quais NC compõem esse crédito?" },
      { sender: "assistant", text: originalAnswer },
    ]);
    expect(history).toHaveLength(2);
    expect(history[1].content.length).toBeLessThanOrEqual(AI_HISTORY_MESSAGE_LIMIT);
    expect(history[1].content).toContain("UG/UASG 160136");
    expect(history[1].content).toContain("Fonte: MCL_MESTRE_CREDITOS_V2_TESTE.xlsx");
    expect(history[1].content).toContain("consulte novamente a fonte estruturada");
    expect(originalAnswer).not.toBe(history[1].content);
    expect(mclChatRequestSchema.safeParse({
      prompt: "Qual a NC mais urgente? E qual a ND dela?",
      scope: "Todos os Dados", history,
    }).success).toBe(true);
    expect(mclChatRequestSchema.safeParse({
      prompt: "Você consegue transformar em uma tabela?",
      scope: "Todos os Dados", history,
    }).success).toBe(true);
  });

  it("não envia respostas de erro e preserva a última pergunta válida", () => {
    const history = buildBoundedMclHistory([
      { sender: "user", text: "Liste as NC do saldo." },
      { sender: "assistant", text: "Saldo da UG/UASG 160136", errorCode: "AI_REQUEST_FAILED" },
      { sender: "user", text: "Quais NC vencem primeiro?" },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Liste as NC do saldo." },
      { role: "user", content: "Quais NC vencem primeiro?" },
    ]);
  });

  it("usa somente as oito mensagens anteriores mais recentes", () => {
    const history = buildBoundedMclHistory(Array.from({length:14},(_,i)=>({
      sender: i%2===0 ? "user" as const : "assistant" as const,
      text: "Mensagem " + i,
    })));
    expect(history).toHaveLength(AI_HISTORY_MAX_MESSAGES);
    expect(history[0].content).toBe("Mensagem 6");
    expect(history.at(-1)?.content).toBe("Mensagem 13");
  });
});
