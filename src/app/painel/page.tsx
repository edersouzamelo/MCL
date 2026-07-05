import { AppShell } from "@/components/AppShell";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Badge, Card, InlineLink, MetricCard, PageHeader, formatDateTime } from "@/components/ui";
import Link from "next/link";
import { scoreNeed } from "@/modules/analytics/multicriteria";
import { dashboardMetrics, itemForVariant, organizationName } from "@/modules/demo/selectors";
import { getDemoState } from "@/server/demo-store";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import type { DemoState, Need } from "@/modules/domain/types";
import { projectNeed } from "@/modules/events/projection";

export const dynamic = "force-dynamic";

interface MaterialCoverageRow {
  needId: string;
  persistentCode: string;
  material: string;
  deficit: number;
  catmatCode: string;
  atasVigentesCount: number;
  saldoInformado: string;
  confianca: number;
  atualizadoEm: string;
}

type NumericRecordValue = number | string | { toString(): string } | null | undefined;

interface DbAcquisitionInstrumentDashboard {
  id: string;
  itemCode?: string | null;
  quantity?: NumericRecordValue;
  unitValue?: NumericRecordValue;
  totalValue?: NumericRecordValue;
  sourceSystem?: string | null;
  validFrom: Date | string;
  validUntil: Date | string;
  status: string;
}

interface DbArpUnitRecordDashboard {
  quantidadeRegistrada?: NumericRecordValue;
  saldoAdesoes?: NumericRecordValue;
  saldoRemanejamentoEmpenho?: NumericRecordValue;
  qtdLimiteAdesao?: NumericRecordValue;
  qtdLimiteInformadoCompra?: NumericRecordValue;
}

interface DbMaterialCoverageAnalysisDashboard {
  id: string;
  needId: string;
  status: string;
  confidence?: number | null;
  updatedAt: Date | string;
}

interface DbAcquisitionCoverageCandidateDashboard {
  analysisId: string;
  acquisitionInstrumentId: string;
  reportedBalance?: number | null;
}

interface DbItemCatalogMappingDashboard {
  needId?: string | null;
  externalItemCode: string;
  status: string;
}

function numberFromDb(value: NumericRecordValue): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}

function isoFromDbDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export default async function DashboardPage() {
  let isPostgres = persistenceMode() === "postgresql";
  let state: DemoState = getDemoState();

  if (isPostgres) {
    try {
      const dbNeeds = await prisma.need.findMany();
    const dbVariants = await prisma.itemVariant.findMany();
    const dbItems = await prisma.supplyItem.findMany();
    const dbOrganizations = await prisma.organization.findMany();
    const dbCoverages = await prisma.needCoverage.findMany();
    const dbLocations = await prisma.location.findMany();
    const dbUnits = await prisma.logisticsUnit.findMany();
    const dbDivergences = await prisma.divergence.findMany();
    const dbConnectors = await prisma.connectorHealth.findMany();
    const dbQuarantine = await prisma.quarantineRecord.findMany();
    const dbInstruments = (await prisma.acquisitionInstrument.findMany()) as DbAcquisitionInstrumentDashboard[];
    const dbMappings = await prisma.itemCatalogMapping.findMany();
    const dbQueries = await prisma.coverageQuery.findMany();
    const dbUnitRecords = (await prisma.arpUnitRecord.findMany()) as DbArpUnitRecordDashboard[];
    const dbEvents = await prisma.logisticsEvent.findMany();
    const dbRelations = await prisma.eventRelation.findMany();
    const dbLinks = await prisma.objectLink.findMany();
    const dbCredits = await prisma.credit.findMany();
    const dbCommitments = await prisma.commitment.findMany();
    const dbShipments = await prisma.shipment.findMany();
    const dbShipmentUnits = await prisma.shipmentUnit.findMany();
    const dbDocs = await prisma.documentReference.findMany();
    const dbRuns = await prisma.connectorRun.findMany();
    const dbLogs = await prisma.auditLog.findMany();
    const dbUsers = await prisma.user.findMany();
    const dbScopes = await prisma.userScope.findMany();
    const dbLots = await prisma.lot.findMany();
    const dbExternalRecords = await prisma.externalRecord.findMany();
    const dbSearchCandidates = await prisma.catalogSearchCandidate.findMany();

    state = {
      needs: dbNeeds as any,
      itemVariants: dbVariants as any,
      supplyItems: dbItems as any,
      organizations: dbOrganizations as any,
      needCoverages: dbCoverages as any,
      locations: dbLocations as any,
      logisticsUnits: dbUnits as any,
      divergences: dbDivergences as any,
      connectors: dbConnectors as any,
      quarantine: dbQuarantine as any,
      acquisitionInstruments: dbInstruments.map((instrument: DbAcquisitionInstrumentDashboard) => ({
        ...instrument,
        quantity: numberFromDb(instrument.quantity) ?? 0,
        unitValue: numberFromDb(instrument.unitValue),
        totalValue: numberFromDb(instrument.totalValue),
      })) as any,
      itemCatalogMappings: dbMappings as any,
      coverageQueries: dbQueries as any,
      arpUnitRecords: dbUnitRecords.map((record: DbArpUnitRecordDashboard) => ({
        ...record,
        quantidadeRegistrada: numberFromDb(record.quantidadeRegistrada),
        saldoAdesoes: numberFromDb(record.saldoAdesoes),
        saldoRemanejamentoEmpenho: numberFromDb(record.saldoRemanejamentoEmpenho),
        qtdLimiteAdesao: numberFromDb(record.qtdLimiteAdesao),
        qtdLimiteInformadoCompra: numberFromDb(record.qtdLimiteInformadoCompra),
      })) as any,
      events: dbEvents as any,
      eventRelations: dbRelations as any,
      objectLinks: dbLinks as any,
      credits: dbCredits as any,
      commitments: dbCommitments as any,
      shipments: dbShipments as any,
      shipmentUnits: dbShipmentUnits as any,
      documents: dbDocs as any,
      connectorRuns: dbRuns as any,
      auditLogs: dbLogs as any,
      users: dbUsers as any,
      userScopes: dbScopes as any,
      lots: dbLots as any,
      externalRecords: dbExternalRecords as any,
      catalogSearchCandidates: dbSearchCandidates as any,
      multicriteriaWeights: [
        {
          id: "w-demo",
          version: "1",
          urgency: 0.35,
          operationalImpact: 0.25,
          stockRisk: 0.2,
          logisticsLeadTime: 0.2,
          financialCoverage: 0.2,
        },
      ],
    };
    } catch (error) {
      console.error("Erro ao carregar dados do Supabase no Painel, usando memória:", error);
      isPostgres = false;
    }
  }

  if (!isPostgres) {
    state = getDemoState();
  }

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

  let needsAwaitingAnalysis = 0;
  let materialsWithoutCatmat = 0;
  let materialsWithCatmat = 0;
  let materialsWithAtas = 0;
  let materialsWithoutResult = 0;
  let materialsWithBalance = 0;
  let staleAnalyses = 0;
  let queryFailures = 0;
  let tableRows: MaterialCoverageRow[] = [];

  if (!isPostgres) {
    needsAwaitingAnalysis = state.needs.filter(
      (n) => !state.itemCatalogMappings.some((m) => m.needId === n.id && m.status === "ACTIVE")
    ).length;
    materialsWithoutCatmat = needsAwaitingAnalysis;
    materialsWithCatmat = state.itemCatalogMappings.filter((m) => m.status === "ACTIVE").length;
    materialsWithAtas = state.itemCatalogMappings.filter((m) =>
      state.acquisitionInstruments.some((i) => i.sourceSystem === "COMPRAS_GOV" && i.itemCode === m.externalItemCode)
    ).length;
    materialsWithoutResult = materialsWithCatmat - materialsWithAtas;
    tableRows = state.needs.map((need) => {
      const { item, variant } = itemForVariant(state, need.itemVariantId);
      const mapping = state.itemCatalogMappings.find((m) => m.needId === need.id && m.status === "ACTIVE");
      const projection = projectNeed(need, state);
      const deficit = Math.max(0, need.quantityRequested - projection.totalCovered);
      const relatedAtas = mapping
        ? state.acquisitionInstruments.filter((i) => i.sourceSystem === "COMPRAS_GOV" && i.itemCode === mapping.externalItemCode)
        : [];
      return {
        needId: need.id,
        persistentCode: need.persistentCode,
        material: `${item?.name ?? "Desconhecido"} ${variant?.label ?? ""}`,
        deficit,
        catmatCode: mapping?.externalItemCode ?? "Pendente",
        atasVigentesCount: relatedAtas.length,
        saldoInformado: relatedAtas.length > 0 ? "Consultavel na fonte" : "Nao consultado",
        confianca: mapping ? 0.75 : 0.0,
        atualizadoEm: mapping ? mapping.confirmedAt : "Nunca",
      };
    });
  }

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
      <section className="mt-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5">
        <h2 className="text-base font-bold text-zinc-900">Cenário Atual do Piloto</h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <p className="text-sm text-zinc-600">Material Demonstrativo Classe II: <strong className="text-zinc-800">Coturno operacional nº 42</strong></p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Necessidade ativa de demonstração: {mainNeed?.persistentCode}</p>
          </div>
          <Link href={`/necessidades/${mainNeed?.id}/buscar-cobertura`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded text-center block font-semibold transition-all hover:shadow shadow-sm">ATUALIZAR DADOS DO MATERIAL</Link>
        </div>
      </section>
      <section className="mt-6">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div><h2 className="text-lg font-semibold text-zinc-900">Cobertura de aquisição por material</h2><p className="mt-1 text-sm text-zinc-600">Acompanhamento analítico da correlação CATMAT de necessidades com atas vigentes e consulta de saldos no Compras.gov.br.</p></div>
            <Badge tone="info">{isPostgres ? "PostgreSQL Ativo" : "Memória Fallback"}</Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Aguardando análise</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{needsAwaitingAnalysis}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Sem CATMAT</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{materialsWithoutCatmat}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Com CATMAT</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{materialsWithCatmat}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Com atas vigentes</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{materialsWithAtas}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Sem resultado</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{materialsWithoutResult}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Com saldo informado</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{materialsWithBalance}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Desatualizadas</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{staleAnalyses}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt className="text-zinc-500 dark:text-zinc-400 text-xs">Falhas de consulta</dt><dd className="text-2xl font-bold text-zinc-950 mt-1">{queryFailures}</dd></div>
          </dl>
          <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 dark:text-zinc-400"><tr><th className="py-2.5 px-3">Material</th><th>Necessidade</th><th>Déficit</th><th>CATMAT</th><th>Atas Vigentes</th><th>Saldo Informado</th><th>Confiança</th><th>Atualização</th><th className="px-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-zinc-100">{tableRows.map((row) => (<tr key={row.needId} className="hover:bg-zinc-50 dark:bg-zinc-800/50/50"><td className="py-3 px-3 font-semibold text-zinc-900">{row.material}</td><td className="font-mono text-xs text-zinc-600">{row.persistentCode}</td><td className="font-semibold text-zinc-700">{row.deficit}</td><td><span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.catmatCode === "Pendente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{row.catmatCode}</span></td><td className="font-semibold text-zinc-800">{row.atasVigentesCount}</td><td className="text-zinc-700">{row.saldoInformado}</td><td className="font-semibold text-indigo-700">{Math.round(row.confianca * 100)}%</td><td className="text-xs text-zinc-500 dark:text-zinc-400">{row.atualizadoEm !== "Nunca" ? formatDateTime(row.atualizadoEm) : "Nunca"}</td><td className="py-3 px-3 text-right"><InlineLink href={`/necessidades/${row.needId}/buscar-cobertura`}>ABRIR ANÁLISE</InlineLink></td></tr>))}</tbody></table></div>
        </Card>
      </section>
      <div className="mt-6"><DashboardCharts unitsByState={metrics.unitsByState} coverage={coverageData} /></div>
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card><h2 className="mb-3 text-lg font-semibold">Necessidades acompanhadas</h2><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 dark:text-zinc-400"><tr><th className="py-2">Codigo</th><th>Organizacao</th><th>Item</th><th>Cobertura</th><th>Entrega</th><th>Status</th></tr></thead><tbody>{metrics.needs.map(({ need, projection }) => { const { item, variant } = itemForVariant(state, need.itemVariantId); return (<tr key={need.id} className="border-b border-zinc-100"><td className="py-3"><InlineLink href={`/necessidades/${need.id}`}>{need.persistentCode}</InlineLink></td><td>{organizationName(state, need.organizationId)}</td><td>{item?.name} {variant?.size}</td><td>{projection.coveragePercent}%</td><td>{projection.deliveredPercent}%</td><td><Badge tone={need.priority === "ALTA" ? "warn" : "neutral"}>{need.status}</Badge></td></tr>); })}</tbody></table></div></Card>
        <Card><h2 className="mb-2 text-lg font-semibold">Analise multicriterio</h2><p className="text-4xl font-semibold text-emerald-800">{score.score}</p><p className="mt-2 text-sm text-zinc-600">Resultado deterministico com pesos demonstrativos v{score.weightsVersion}. Nao usa LLM e requer aceite humano.</p><dl className="mt-4 space-y-2 text-sm">{Object.entries(score.normalized).map(([key, value]) => (<div key={key} className="flex justify-between gap-3"><dt>{key}</dt><dd className="font-semibold">{Math.round(value * 100)}%</dd></div>))}</dl></Card>
      </section>
    </AppShell>
  );
}
