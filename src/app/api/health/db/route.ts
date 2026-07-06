import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    // Realiza uma consulta real simples para testar a conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1 as connected`;
    return NextResponse.json({
      status: "UP",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Loga o erro internamente para auditoria no servidor
    console.error("Health check DB connection failed:", error);

    // Retorna uma resposta higienizada sem expor detalhes internos ou credenciais
    return NextResponse.json(
      {
        status: "DOWN",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}