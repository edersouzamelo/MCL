import { NextResponse } from "next/server";
import { queryMclRagEngine } from "@/modules/ai/rag-engine";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const state = getDemoState();
    const response = queryMclRagEngine(prompt, state);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        answer: "Ocorreu um erro ao processar a consulta RAG. Por favor, tente novamente.",
        citations: [],
        suggestedQuestions: ["Quais são as regras da Lei 14.133 para adesão?"],
        confidenceScore: 0,
      },
      { status: 500 }
    );
  }
}
