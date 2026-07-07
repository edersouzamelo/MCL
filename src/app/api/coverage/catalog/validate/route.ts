import { NextResponse } from "next/server";
import { getRouteActor } from "@/modules/auth/route-actor";
import { validateOfficialCode } from "@/modules/coverage/official-catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getRouteActor();
  if (!actor) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { catalogType, externalCode } = body;

    if (!catalogType || !externalCode) {
      return NextResponse.json(
        { error: "Parâmetros 'catalogType' e 'externalCode' são obrigatórios." },
        { status: 400 }
      );
    }

    if (catalogType !== "CATMAT" && catalogType !== "CATSER") {
      return NextResponse.json(
        { error: "Tipo de catálogo inválido. Deve ser 'CATMAT' ou 'CATSER'." },
        { status: 400 }
      );
    }

    const result = await validateOfficialCode(catalogType, externalCode);

    if (result.status === "UNSUPPORTED") {
      return NextResponse.json(
        {
          error: "CATSER previsto na arquitetura, mas endpoint oficial ainda não confirmado nesta implementação.",
          status: "UNSUPPORTED",
          details: "when supported by the current integration"
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      item: {
        catalogType: result.catalogType,
        externalCode: result.externalCode,
        description: result.description,
        sourceSystem: result.sourceSystem,
        sourceUrl: result.sourceUrl,
        fetchedAt: result.fetchedAt,
        payloadHash: result.payloadHash,
        sourceUpdatedAt: result.sourceUpdatedAt,
        status: result.status,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao validar item no catálogo oficial." },
      { status: 400 }
    );
  }
}
