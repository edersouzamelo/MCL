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
                  <h2 className="mt-1 text-lg font-bold text-zinc-950 dark:text-zinc-50">{item?.name} - {variant?.label}</h2>
                  <p className="mt-1 text-sm text-zinc-650 dark:text-zinc-400">
                    <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{organizationName(state, need.organizationId)}</strong> solicitou <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{need.quantityRequested} {variant?.unit}</strong>.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <Badge tone={need.priority === "ALTA" ? "warn" : "neutral"}>{need.priority}</Badge>
                  <InlineLink href={`/necessidades/${need.id}/buscar-cobertura`}>Buscar CATMAT e atas</InlineLink>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <p className="rounded-lg bg-zinc-50 dark:bg-zinc-950/45 p-3 text-sm text-zinc-650 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40">
                  Cobertura: <strong className="font-bold text-zinc-900 dark:text-white">{projection.coveragePercent}%</strong>
                </p>
                <p className="rounded-lg bg-zinc-50 dark:bg-zinc-950/45 p-3 text-sm text-zinc-650 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40">
                  Entrega: <strong className="font-bold text-zinc-900 dark:text-white">{projection.deliveredPercent}%</strong>
                </p>
                <p className="rounded-lg bg-zinc-50 dark:bg-zinc-950/45 p-3 text-sm text-zinc-650 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40">
                  Divergências corrigidas: <strong className="font-bold text-zinc-900 dark:text-white">{projection.correctedDivergences}</strong>
                </p>
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
