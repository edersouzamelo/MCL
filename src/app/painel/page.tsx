import { AppShell } from "@/components/AppShell";
import { Badge, Card, InlineLink, PageHeader } from "@/components/ui";
import { PrduCoverageDashboard } from "@/components/PrduCoverageDashboard";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";
import { getDemoState } from "@/server/demo-store";
import { projectNeed } from "@/modules/events/projection";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const state = getDemoState();

  const tableRows = state.needs.map((need) => {
    const { item, variant } = itemForVariant(state, need.itemVariantId);
    const projection = projectNeed(need, state);
    const mapping = state.itemCatalogMappings.find((m) => m.needId === need.id && m.status === "ACTIVE");
    const relatedAtas = mapping
      ? state.acquisitionInstruments.filter((i) => i.sourceSystem === "COMPRAS_GOV" && i.itemCode === mapping.externalItemCode)
      : [];
    return {
      needId: need.id,
      organization: organizationName(state, need.organizationId),
      material: `${item?.name ?? "Item"} ${variant?.label ?? ""}`.trim(),
      requested: need.quantityRequested,
      covered: projection.totalCovered,
      deficit: Math.max(0, need.quantityRequested - projection.totalCovered),
      coverage: projection.coveragePercent,
      catmatCode: mapping?.externalItemCode ?? "Pendente",
      atasCount: relatedAtas.length,
    };
  });

  const catmatMapped = tableRows.filter((row) => row.catmatCode !== "Pendente").length;
  const atasCount = tableRows.reduce((acc, row) => acc + row.atasCount, 0);

  return (
    <AppShell>
      <PageHeader
        title="Situação geral da cadeia"
        description="Visão consolidada da posição logística. O primeiro bloco correlaciona necessidade de referência PRDU e estoque disponível; blocos demonstrativos remanescentes são explicitamente separados."
        action={<InlineLink href="/importacao">Abrir Input</InlineLink>}
      />

      <PrduCoverageDashboard />

      <section className="mt-8">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warn">Demonstração</Badge>
                <Badge tone="neutral">Piloto CATMAT/ARP</Badge>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cobertura de aquisição por material</h2>
              <p className="mt-1 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Esta seção preserva o piloto de correlação entre necessidades, CATMAT e atas. Os registros abaixo ainda vêm do estado demonstrativo em memória e não alimentam a cobertura PRDU exibida acima.
              </p>
            </div>
            <Badge tone="info">{catmatMapped} CATMAT vinculados · {atasCount} atas</Badge>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                <tr>
                  <th className="px-3 py-2.5">Material</th>
                  <th>Organização</th>
                  <th>Solicitado</th>
                  <th>Coberto</th>
                  <th>Déficit</th>
                  <th>CATMAT</th>
                  <th>Atas</th>
                  <th>Cobertura</th>
                  <th className="px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {tableRows.map((row) => (
                  <tr key={row.needId} className="transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-900/35">
                    <td className="px-3 py-3 font-bold text-zinc-900 dark:text-zinc-100">{row.material}</td>
                    <td className="text-zinc-700 dark:text-zinc-300">{row.organization}</td>
                    <td className="text-zinc-800 dark:text-zinc-300">{row.requested}</td>
                    <td className="text-zinc-800 dark:text-zinc-300">{row.covered}</td>
                    <td className="font-extrabold text-rose-650 dark:text-rose-400">{row.deficit}</td>
                    <td>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        row.catmatCode === "Pendente"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-400"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                      }`}>
                        {row.catmatCode}
                      </span>
                    </td>
                    <td className="text-zinc-800 dark:text-zinc-300">{row.atasCount}</td>
                    <td className="font-medium text-zinc-900 dark:text-zinc-100">{row.coverage}%</td>
                    <td className="px-3 py-3 text-right"><InlineLink href={`/necessidades/${row.needId}/buscar-cobertura`}>ABRIR ANÁLISE</InlineLink></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
