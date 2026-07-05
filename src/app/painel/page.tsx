import { AppShell } from "@/components/AppShell";
import { Badge, Card, InlineLink, MetricCard, PageHeader } from "@/components/ui";
import { dashboardMetrics, itemForVariant, organizationName } from "@/modules/demo/selectors";
import { getDemoState } from "@/server/demo-store";
import { projectNeed } from "@/modules/events/projection";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const state = getDemoState();
  const metrics = dashboardMetrics(state);
  const mainNeed = state.needs[0];
  const mainProjection = mainNeed ? projectNeed(mainNeed, state) : undefined;

  const tableRows = state.needs.map((need) => {
    const { item, variant } = itemForVariant(state, need.itemVariantId);
    const projection = projectNeed(need, state);
    const mapping = state.itemCatalogMappings.find((m) => m.needId === need.id && m.status === "ACTIVE");
    const relatedAtas = mapping
      ? state.acquisitionInstruments.filter((i) => i.sourceSystem === "COMPRAS_GOV" && i.itemCode === mapping.externalItemCode)
      : [];
    return {
      needId: need.id,
      persistentCode: need.persistentCode,
      organization: organizationName(state, need.organizationId),
      material: `${item?.name ?? "Item"} ${variant?.label ?? ""}`.trim(),
      requested: need.quantityRequested,
      covered: projection.totalCovered,
      deficit: Math.max(0, need.quantityRequested - projection.totalCovered),
      coverage: projection.coveragePercent,
      delivered: projection.deliveredPercent,
      catmatCode: mapping?.externalItemCode ?? "Pendente",
      atasCount: relatedAtas.length,
    };
  });

  const catmatMapped = tableRows.filter((row) => row.catmatCode !== "Pendente").length;
  const atasCount = tableRows.reduce((acc, row) => acc + row.atasCount, 0);

  return (
    <AppShell>
      <PageHeader
        title="Situacao geral da cadeia"
        description="Visao consolidada do piloto em modo memoria: necessidades, cobertura, estoque rastreavel, CATMAT, atas e divergencias."
        action={mainNeed ? <InlineLink href={`/necessidades/${mainNeed.id}/buscar-cobertura`}>Abrir cobertura CATMAT/ARP</InlineLink> : undefined}
      />

      <div className="mb-4">
        <Badge tone="warn">Modo memoria seguro</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Necessidades" value={state.needs.length} detail="Demandas do piloto Classe II" />
        <MetricCard label="Unidades rastreaveis" value={metrics.totalUnits} detail={`${metrics.deliveredUnits} entregues`} tone="good" />
        <MetricCard label="Cobertura principal" value={mainProjection ? `${mainProjection.coveragePercent}%` : "0%"} detail="Estoque e vinculos conhecidos" tone="warn" />
        <MetricCard label="Divergencias abertas" value={metrics.openDivergences} detail="Monitoramento operacional" tone={metrics.openDivergences ? "bad" : "good"} />
      </div>

      <section className="mt-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Cenario atual do piloto</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Necessidade ativa de demonstracao: <strong>{mainNeed?.persistentCode ?? "sem necessidade ativa"}</strong>. O painel foi estabilizado para nao depender de leitura direta do PostgreSQL enquanto a cadeia CATMAT e sincronizada.
        </p>
      </section>

      <section className="mt-6">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cobertura de aquisicao por material</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Acompanhamento da correlacao CATMAT de necessidades com atas e saldos.</p>
            </div>
            <Badge tone="info">{catmatMapped} CATMAT vinculados · {atasCount} atas</Badge>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3">Material</th>
                  <th>Organizacao</th>
                  <th>Solicitado</th>
                  <th>Coberto</th>
                  <th>Deficit</th>
                  <th>CATMAT</th>
                  <th>Atas</th>
                  <th>Cobertura</th>
                  <th className="px-3 text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tableRows.map((row) => (
                  <tr key={row.needId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{row.material}</td>
                    <td className="text-zinc-700 dark:text-zinc-300">{row.organization}</td>
                    <td>{row.requested}</td>
                    <td>{row.covered}</td>
                    <td className="font-semibold">{row.deficit}</td>
                    <td><span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.catmatCode === "Pendente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{row.catmatCode}</span></td>
                    <td>{row.atasCount}</td>
                    <td>{row.coverage}%</td>
                    <td className="py-3 px-3 text-right"><InlineLink href={`/necessidades/${row.needId}/buscar-cobertura`}>ABRIR ANALISE</InlineLink></td>
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
