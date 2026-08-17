import { NextResponse } from "next/server";
import { parseSiafiBuffer, processSiafiIngestion } from "@/modules/connectors/siafi/parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado no payload multipart/form-data." },
        { status: 400 }
      );
    }

    const filename = file.name || "MCL_MESTRE_EXERCICIO_2026.xlsx";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const records = parseSiafiBuffer(buffer, filename);
    const result = processSiafiIngestion(records, filename);

    return NextResponse.json({
      success: true,
      message: `Relatório do Tesouro Gerencial '${filename}' processado com sucesso!`,
      result,
    });
  } catch (error: any) {
    console.error("Erro na ingestão do Tesouro Gerencial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha interna ao processar planilha do SIAFI/TG." },
      { status: 500 }
    );
  }
}
