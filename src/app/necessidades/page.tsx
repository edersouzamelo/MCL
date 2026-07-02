import { AppShell } from "@/components/AppShell";
import { Badge, Card, InlineLink, PageHeader, SourceStamp } from "@/components/ui";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";
import { projectNeed } from "@/modules/events/projection";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function NeedsPage() {
  const state = getDemoState();

  return (
    <AppShell>
      <PageHeader
        title="Necessidades"
        description="Demandas sinteticas de fardamento Classe II com origem, confianca, cobertura e progresso fisico."
      />
      <div className="grid gap-4">
        {state.needs.map((need) => {
          const { item, variant } = itemForVariant(state, need.itemVariantId);
          const projection = projectNeed(need, state);
          return (
            <Card key={need.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <InlineLink href={`/necessidades/${need.id}`}>{need.persistentCode}</InlineLink>
                  <h2 className="mt-1 text-lg font-semibold">{item?.name} - {variant?.label}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{organizationName(state, need.organizationId)} solicitou {need.quantityRequested} {variant?.unit}.</p>
                </div>
                <Badge tone={need.priority === "ALTA" ? "warn" : "neutral"}>{need.priority}</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <p className="rounded bg-zinc-50 p-3 text-sm">Cobertura: <strong>{projection.coveragePercent}%</strong></p>
                <p className="rounded bg-zinc-50 p-3 text-sm">Entrega: <strong>{projection.deliveredPercent}%</strong></p>
                <p className="rounded bg-zinc-50 p-3 text-sm">Divergencias corrigidas: <strong>{projection.correctedDivergences}</strong></p>
              </div>
              <div className="mt-4">
                <SourceStamp source={need} />
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
