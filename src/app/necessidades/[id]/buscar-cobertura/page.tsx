import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CoverageJourneyClient } from "@/components/CoverageJourneyClient";
import { InlineLink, PageHeader } from "@/components/ui";
import { activeCatalogMappingForNeed } from "@/modules/coverage/service";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";
import { projectNeed } from "@/modules/events/projection";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default async function NeedCoverageSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = getDemoState();
  const need = state.needs.find((candidate) => candidate.id === id);
  if (!need) {
    notFound();
  }
  const { item, variant } = itemForVariant(state, need.itemVariantId);
  if (!item || !variant) {
    notFound();
  }
  const stockCovered = state.needCoverages
    .filter((coverage) => coverage.needId === need.id && coverage.coverageType === "ESTOQUE")
    .reduce((sum, coverage) => sum + coverage.quantity, 0);
  const projection = projectNeed(need, state);
  const mapping = activeCatalogMappingForNeed(state, need.id);

  return (
    <AppShell>
      <PageHeader
        title="Cobertura de aquisicao"
        description={`${need.persistentCode} - ${item.name} ${variant.size}, com pesquisa CATMAT e consulta de atas orientada pela necessidade.`}
        action={<InlineLink href={`/necessidades/${need.id}`}>Voltar a necessidade</InlineLink>}
      />
      <CoverageJourneyClient
        need={{
          id: need.id,
          persistentCode: need.persistentCode,
          quantityRequested: need.quantityRequested,
          quantityApproved: need.quantityApproved,
          status: need.status,
          priority: need.priority,
          requiredAt: need.requiredAt,
        }}
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
        organizationName={organizationName(state, need.organizationId)}
        projection={{
          stockCovered,
          deficit: Math.max(0, need.quantityRequested - stockCovered),
          coveragePercent: projection.coveragePercent,
          deliveredPercent: projection.deliveredPercent,
        }}
        initialMapping={mapping}
      />
    </AppShell>
  );
}
