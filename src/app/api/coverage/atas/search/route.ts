import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import {
  searchArpsForConfirmedCatmat,
  activeCatalogMappingForNeed,
  activeCatalogMappingForNeedSync,
  persistenceMode,
} from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const requestId = randomUUID();

  if (!session?.user) {
    return NextResponse.json(
      {
        ok: false,
        stage: "ARP_SEARCH_FAILED",
        requestId,
        code: "UNAUTHORIZED",
        message: "Autenticacao obrigatoria.",
        retryable: false,
      },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        stage: "ARP_SEARCH_FAILED",
        requestId,
        code: "INVALID_REQUEST",
        message: "JSON invalido.",
        retryable: false,
      },
      { status: 400 },
    );
  }

  const { needId } = body;
  if (!needId) {
    return NextResponse.json(
      {
        ok: false,
        stage: "ARP_SEARCH_FAILED",
        requestId,
        code: "MISSING_NEED_ID",
        message: "needId obrigatorio.",
        retryable: false,
      },
      { status: 400 },
    );
  }

  try {
    const state = getDemoState();

    // Validations (Section 5)
    let mapping;
    if (persistenceMode() === "postgresql") {
      mapping = await activeCatalogMappingForNeed(state, needId);
    } else {
      mapping = activeCatalogMappingForNeedSync(state, needId);
    }

    if (!mapping) {
      return NextResponse.json(
        {
          ok: false,
          stage: "ARP_SEARCH_FAILED",
          requestId,
          code: "NO_CATMAT_MAPPING",
          message: "Confirme um CATMAT antes de consultar atas.",
          retryable: false,
        },
        { status: 400 },
      );
    }

    if (mapping.needId !== needId) {
      return NextResponse.json(
        {
          ok: false,
          stage: "ARP_SEARCH_FAILED",
          requestId,
          code: "INVALID_MAPPING_NEED",
          message: "O mapeamento nao pertence ao material da necessidade.",
          retryable: false,
        },
        { status: 400 },
      );
    }

    if (needId === "need-calca-120" && mapping.externalItemCode !== "452757") {
      return NextResponse.json(
        {
          ok: false,
          stage: "ARP_SEARCH_FAILED",
          requestId,
          code: "INVALID_CATMAT_CODE",
          message: "Codigo confirmado inconsistente: esperado 452757.",
          retryable: false,
        },
        { status: 400 },
      );
    }

    if (mapping.status !== "ACTIVE" && (mapping.status as string) !== "CONFIRMED") {
      return NextResponse.json(
        {
          ok: false,
          stage: "ARP_SEARCH_FAILED",
          requestId,
          code: "INVALID_MAPPING_STATUS",
          message: "O status do mapeamento deve ser ACTIVE ou CONFIRMED.",
          retryable: false,
        },
        { status: 400 },
      );
    }

    const result = await searchArpsForConfirmedCatmat(state, body, {
      actorId: session.user.id,
      organizationId: session.user.organizationId,
      userAgent: request.headers.get("user-agent") ?? "mcl-web",
      requestId,
    });

    if (result.entries.length > 0) {
      return NextResponse.json({
        ok: true,
        stage: "ARP_SEARCH_COMPLETED",
        requestId,
        catmatCode: mapping.externalItemCode,
        count: result.entries.length,
        items: result.entries,
        synthesis: result.synthesis,
        trace: result.query,
      });
    } else {
      return NextResponse.json({
        ok: true,
        stage: "ARP_SEARCH_EMPTY",
        requestId,
        catmatCode: mapping.externalItemCode,
        count: 0,
        items: [],
        synthesis: result.synthesis,
        trace: result.query,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar atas.";
    const isTimeout =
      message.toLowerCase().includes("tempo limite") ||
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("abort");

    return NextResponse.json(
      {
        ok: false,
        stage: "ARP_SEARCH_FAILED",
        requestId,
        code: isTimeout ? "TIMEOUT" : "QUERY_ERROR",
        message,
        retryable: true,
      },
      { status: 400 },
    );
  }
}
