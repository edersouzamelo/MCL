import { AppShell } from "@/components/AppShell";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Badge, Card, InlineLink, MetricCard, PageHeader } from "@/components/ui";
import { scoreNeed } from "@/modules/analytics/multicriteria";
import { dashboardMetrics, itemForVariant, organizationName } from "@/modules/demo/selectors";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const state = getDemoState();
  const metrics = dashboardMetrics(state);
  const coverageData = metrics.needs.map(({ need, projection }) => ({
    code: need.persistentCode.replace("MCL-NEC-2026-", "N"),
    cobertura: projection.coveragePercent,
    entrega: projection.deliveredPercent,
  }));
  const mainNeed = state.needs[0];
  const mainProjection = metrics.needs[0].projection;
  const score = scoreNeed(
    {
      need: mainNeed,
      stockCoveragePercent: mainProjection.coveragePercent,
      daysUntilRequired: 18,
      connectorRisk: metrics.connectorIssues,
      financialCoveragePercent: 73,
    },
    state.multicriteriaWeights[0],
  );

  return (
    <AppShell>
      <PageHeader
        title="Situacao geral da cadeia"
        description="Visao consolidada do piloto: necessidades, cobertura, estoque rastreavel, conectores, divergencias e auditoria."
        action={<InlineLink href="/scanner">Ler QR de uma caixa</InlineLink>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Necessidades" value={state.needs.length} detail="3 demandas sinteticas Classe II" />
        <MetricCard label="Unidades rastreaveis" value={metrics.totalUnits} detail={`${metrics.deliveredUnits} entregues`} tone="good" />
        <MetricCard label="Divergencias abertas" value={metrics.openDivergences} detail="1 corrigida preservando historico" tone={metrics.openDivergences ? "bad" : "good"} />
        <MetricCard label="Conectores com alerta" value={metrics.connectorIssues} detail={`${metrics.quarantineCount} registros em quarentena`} tone="warn" />
      </div>

      <div className="mt-6">
        <DashboardCharts unitsByState={metrics.unitsByState} coverage={coverageData} />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Necessidades acompanhadas</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2">Codigo</th>
                  <th>Organizacao</th>
                  <th>Item</th>
                  <th>Cobertura</th>
                  <th>Entrega</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.needs.map(({ need, projection }) => {
                  const { item, variant } = itemForVariant(state, need.itemVariantId);
                  return (
                    <tr key={need.id} className="border-b border-zinc-100">
                      <td className="py-3">
                        <InlineLink href={`/necessidades/${need.id}`}>{need.persistentCode}</InlineLink>
                      </td>
                      <td>{organizationName(state, need.organizationId)}</td>
                      <td>{item?.name} {variant?.size}</td>
                      <td>{projection.coveragePercent}%</td>
                      <td>{projection.deliveredPercent}%</td>
                      <td><Badge tone={need.priority === "ALTA" ? "warn" : "neutral"}>{need.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Analise multicriterio</h2>
          <p className="text-4xl font-semibold text-emerald-800">{score.score}</p>
          <p className="mt-2 text-sm text-zinc-600">Resultado deterministico com pesos demonstrativos v{score.weightsVersion}. Nao usa LLM e requer aceite humano.</p>
          <dl className="mt-4 space-y-2 text-sm">
            {Object.entries(score.normalized).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt>{key}</dt>
                <dd className="font-semibold">{Math.round(value * 100)}%</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </AppShell>
  );
}
