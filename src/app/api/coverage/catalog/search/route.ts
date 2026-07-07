import { NextResponse } from "next/server";
import { getRouteActor } from "@/modules/auth/route-actor";
import { searchOfficialCatalog } from "@/modules/coverage/official-catalog";
import { getDemoState } from "@/server/demo-store";
import { persistenceMode } from "@/modules/coverage/service";
import { prisma } from "@/server/db";
import { randomUUID } from "node:crypto";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getRouteActor();
  if (!actor) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "getNeed") {
      const { needId } = body;
      if (!needId) {
        return NextResponse.json({ error: "Parâmetro 'needId' é obrigatório." }, { status: 400 });
      }

      const isPostgres = persistenceMode() === "postgresql";
      if (isPostgres) {
        const dbNeed = await prisma.need.findUnique({ where: { id: needId } });
        if (!dbNeed) {
          return NextResponse.json({ error: "Necessidade não localizada." }, { status: 404 });
        }
        const variant = await prisma.itemVariant.findUnique({
          where: { id: dbNeed.itemVariantId },
          include: { item: true }
        });
        const org = await prisma.organization.findUnique({ where: { id: dbNeed.organizationId } });
        return NextResponse.json({
          need: {
            id: dbNeed.id,
            persistentCode: dbNeed.persistentCode,
            quantityRequested: dbNeed.quantityRequested,
            quantityApproved: dbNeed.quantityApproved,
            status: dbNeed.status,
            priority: dbNeed.priority,
          },
          item: variant?.item ? { name: variant.item.name, description: variant.item.description } : null,
          variant: variant ? { label: variant.label, size: variant.size, unit: variant.unit } : null,
          orgName: org?.name ?? dbNeed.organizationId,
        });
      } else {
        const state = getDemoState();
        const demoNeed = state.needs.find((c) => c.id === needId);
        if (!demoNeed) {
          return NextResponse.json({ error: "Necessidade não localizada em memória." }, { status: 404 });
        }
        const { item, variant } = itemForVariant(state, demoNeed.itemVariantId);
        const orgName = organizationName(state, demoNeed.organizationId);
        return NextResponse.json({
          need: {
            id: demoNeed.id,
            persistentCode: demoNeed.persistentCode,
            quantityRequested: demoNeed.quantityRequested,
            quantityApproved: demoNeed.quantityApproved,
            status: demoNeed.status,
            priority: demoNeed.priority,
          },
          item,
          variant,
          orgName,
        });
      }
    }

    if (action === "search") {
      const { query, catalogType } = body;
      if (!query || !catalogType) {
        return NextResponse.json({ error: "Parâmetros 'query' e 'catalogType' são obrigatórios." }, { status: 400 });
      }
      const results = await searchOfficialCatalog(query, catalogType);
      return NextResponse.json({ results });
    }

    if (action === "saveCandidate") {
      const { needId, item } = body;
      if (!needId || !item) {
        return NextResponse.json({ error: "Parâmetros 'needId' e 'item' são obrigatórios." }, { status: 400 });
      }

      const isPostgres = persistenceMode() === "postgresql";
      const candidateId = `candidate-cat-${item.externalCode}-${needId}`;
      const queryId = `query-cat-${randomUUID().slice(0, 8)}`;

      // Save a trace CoverageQuery to audit how the item was fetched
      const queryRecord = {
        id: queryId,
        needId: needId,
        kind: "CATMAT_SEARCH" as const,
        endpoint: item.sourceUrl || "official_catalog_facade",
        params: { code: item.externalCode, source: "official_catalog_facade" },
        status: "SUCCESS" as const,
        recordsRead: 1,
        sourceUrl: item.sourceUrl,
        actorId: actor.id,
        externalCatalog: item.catalogType,
        externalItemCode: item.externalCode,
        startedAt: new Date(),
        finishedAt: new Date(),
        staleAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const candidateRecord = {
        id: candidateId,
        queryId: queryId,
        needId: needId,
        externalCatalog: item.catalogType,
        externalItemCode: item.externalCode,
        externalDescription: item.description,
        groupCode: item.payload?.codigoGrupo ? String(item.payload.codigoGrupo) : undefined,
        classCode: item.payload?.codigoClasse ? String(item.payload.codigoClasse) : undefined,
        pdmCode: item.payload?.codigoPdm ? String(item.payload.codigoPdm) : undefined,
        statusItem: item.payload?.statusItem ?? true,
        sourceSystem: item.sourceSystem || "COMPRAS_GOV",
        sourceUrl: item.sourceUrl || "",
        sourceUpdatedAt: item.sourceUpdatedAt ? new Date(item.sourceUpdatedAt) : null,
        fetchedAt: new Date(item.fetchedAt),
        similarityScore: 1.0,
        similarityExplanation: "Selecionado manualmente via Catálogo Oficial.",
        payload: item.payload || {},
      };

      if (isPostgres) {
        await prisma.coverageQuery.create({
          data: queryRecord,
        });

        await prisma.catalogSearchCandidate.upsert({
          where: { id: candidateId },
          create: candidateRecord,
          update: {
            queryId: candidateRecord.queryId,
            externalDescription: candidateRecord.externalDescription,
            groupCode: candidateRecord.groupCode,
            classCode: candidateRecord.classCode,
            pdmCode: candidateRecord.pdmCode,
            statusItem: candidateRecord.statusItem,
            sourceUrl: candidateRecord.sourceUrl,
            sourceUpdatedAt: candidateRecord.sourceUpdatedAt,
            fetchedAt: candidateRecord.fetchedAt,
            payload: candidateRecord.payload,
          },
        });
      } else {
        const state = getDemoState();
        state.coverageQueries.unshift({
          ...queryRecord,
          startedAt: queryRecord.startedAt.toISOString(),
          finishedAt: queryRecord.finishedAt.toISOString(),
          staleAt: queryRecord.staleAt.toISOString(),
        } as any);

        const existingIndex = state.catalogSearchCandidates.findIndex((c) => c.id === candidateId);
        const mappedCandidate = {
          ...candidateRecord,
          sourceUpdatedAt: candidateRecord.sourceUpdatedAt?.toISOString() ?? undefined,
          fetchedAt: candidateRecord.fetchedAt.toISOString(),
        } as any;

        if (existingIndex !== -1) {
          state.catalogSearchCandidates[existingIndex] = mappedCandidate;
        } else {
          state.catalogSearchCandidates.unshift(mappedCandidate);
        }
      }

      return NextResponse.json({ success: true, candidateId });
    }

    if (action === "getCandidate") {
      const { candidateId } = body;
      if (!candidateId) {
        return NextResponse.json({ error: "Parâmetro 'candidateId' é obrigatório." }, { status: 400 });
      }

      const isPostgres = persistenceMode() === "postgresql";
      if (isPostgres) {
        const candidate = await prisma.catalogSearchCandidate.findUnique({
          where: { id: candidateId },
        });
        if (!candidate) {
          return NextResponse.json({ error: "Candidato não localizado." }, { status: 404 });
        }
        return NextResponse.json({ candidate });
      } else {
        const state = getDemoState();
        const candidate = state.catalogSearchCandidates.find((c) => c.id === candidateId);
        if (!candidate) {
          return NextResponse.json({ error: "Candidato não localizado em memória." }, { status: 404 });
        }
        return NextResponse.json({ candidate });
      }
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha na rota do catálogo." },
      { status: 400 }
    );
  }
}
