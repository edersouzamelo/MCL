import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CoverageJourneyClient } from "@/components/CoverageJourneyClient";
import { InlineLink, PageHeader } from "@/components/ui";
import { activeCatalogMappingForNeed, activeCatalogMappingForNeedSync, persistenceMode } from "@/modules/coverage/service";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";
import { projectNeed } from "@/modules/events/projection";
import { getDemoState } from "@/server/demo-store";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function NeedCoverageSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isPostgres = persistenceMode() === "postgresql";
  
  let need, item, variant, mapping, stockCovered, orgName, projection, analysisId;

  if (isPostgres) {
    const dbNeed = await prisma.need.findUnique({
      where: { id },
    });
    if (!dbNeed) {
      notFound();
    }
    need = {
      id: dbNeed.id,
      persistentCode: dbNeed.persistentCode,
      quantityRequested: dbNeed.quantityRequested,
      quantityApproved: dbNeed.quantityApproved,
      status: dbNeed.status,
      priority: dbNeed.priority,
      requiredAt: dbNeed.requiredAt.toISOString(),
    };

    const variantData = await prisma.itemVariant.findUnique({
      where: { id: dbNeed.itemVariantId },
      include: { item: true }
    });
    if (!variantData || !variantData.item) {
      notFound();
    }
    
    item = variantData.item;
    variant = variantData;

    const org = await prisma.organization.findUnique({
      where: { id: dbNeed.organizationId }
    });
    orgName = org?.name ?? dbNeed.organizationId;

    const mappingData = await activeCatalogMappingForNeed({} as any, dbNeed.id);
    mapping = mappingData;
    const analysis = await prisma.materialCoverageAnalysis.findFirst({
      where: { needId: dbNeed.id },
      select: { id: true },
    });
    analysisId = analysis?.id ?? `analysis-${dbNeed.id}`;

    const coverages = await prisma.needCoverage.findMany({
      where: { needId: dbNeed.id, coverageType: "ESTOQUE" }
    });
    stockCovered = coverages.reduce((sum: number, coverage: (typeof coverages)[number]) => sum + coverage.quantity, 0);

    projection = {
      stockCovered,
      deficit: Math.max(0, dbNeed.quantityRequested - stockCovered),
      coveragePercent: Math.round((stockCovered / dbNeed.quantityApproved) * 100),
      deliveredPercent: 0,
    };
  } else {
    const state = getDemoState();
    const demoNeed = state.needs.find((candidate) => candidate.id === id);
    if (!demoNeed) {
      notFound();
    }
    need = {
      id: demoNeed.id,
      persistentCode: demoNeed.persistentCode,
      quantityRequested: demoNeed.quantityRequested,
      quantityApproved: demoNeed.quantityApproved,
      status: demoNeed.status,
      priority: demoNeed.priority,
      requiredAt: typeof demoNeed.requiredAt === "string" ? demoNeed.requiredAt : (demoNeed.requiredAt as Date).toISOString(),
    };

    const result = itemForVariant(state, demoNeed.itemVariantId);
    item = result.item;
    variant = result.variant;
    if (!item || !variant) {
      notFound();
    }

    stockCovered = state.needCoverages
      .filter((coverage) => coverage.needId === demoNeed.id && coverage.coverageType === "ESTOQUE")
      .reduce((sum, coverage) => sum + coverage.quantity, 0);
    const needProjection = projectNeed(demoNeed, state);
    orgName = organizationName(state, demoNeed.organizationId);
    mapping = activeCatalogMappingForNeedSync(state, demoNeed.id);
    analysisId = `analysis-${demoNeed.id}`;

    projection = {
      stockCovered,
      deficit: Math.max(0, demoNeed.quantityRequested - stockCovered),
      coveragePercent: needProjection.coveragePercent,
      deliveredPercent: needProjection.deliveredPercent,
    };
  }

  return (
    <AppShell>
      <PageHeader
        title="Cobertura de aquisicao"
        description={`${need.persistentCode} - ${item.name} ${variant.size}, com pesquisa CATMAT e consulta de atas orientada pela necessidade.`}
        action={<InlineLink href={`/necessidades/${need.id}`}>Voltar a necessidade</InlineLink>}
      />
      <CoverageJourneyClient
        need={need}
        item={{
          id: item.id,
          name: item.name,
          description: item.description,
          supplyClass: item.supplyClass,
          baseUnit: item.baseUnit,
        }}
        variant={{
          id: variant.id,
          label: variant.label,
          size: variant.size,
          unit: variant.unit,
        }}
        organizationName={orgName}
        projection={projection}
        initialMapping={mapping as any}
        initialAnalysisId={analysisId}
      />
    </AppShell>
  );
}
