import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, InlineLink, PageHeader, SourceStamp, Timeline } from "@/components/ui";
import { itemForVariant, needTimeline, organizationName } from "@/modules/demo/selectors";
import { projectNeed } from "@/modules/events/projection";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default async function NeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = getDemoState();
  const need = state.needs.find((candidate) => candidate.id === id);
  if (!need) {
    notFound();
  }
  const { item, variant } = itemForVariant(state, need.itemVariantId);
  const projection = projectNeed(need, state);
  const timeline = needTimeline(state, need);
  const linkedLotIds = state.objectLinks.filter((link) => link.fromType === "NEED" && link.fromId === need.id && link.toType === "LOT").map((link) => link.toId);
  const units = state.logisticsUnits.filter((unit) => linkedLotIds.includes(unit.lotId));
  const acquisitionLinks = state.objectLinks.filter(
    (link) =>
      link.fromType === "NEED" &&
      link.fromId === need.id &&
      link.toType === "ACQUISITION_INSTRUMENT" &&
      link.relationType === "PODE_SER_ATENDIDA_POR",
  );
  const possibleInstruments = acquisitionLinks
    .map((link) => ({
      link,
      instrument: state.acquisitionInstruments.find((instrument) => instrument.id === link.toId),
    }))
    .filter((entry) => entry.instrument);

  return (
    <AppShell>
      <PageHeader
        title={need.persistentCode}
        description={`${organizationName(state, need.organizationId)} - ${item?.name} ${variant?.size}.`}
        action={<InlineLink href={`/necessidades/${need.id}/buscar-cobertura`}>Buscar CATMAT e atas</InlineLink>}
      />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{item?.name}</h2>
              <p className="text-sm text-zinc-600">{variant?.label}</p>
            </div>
            <Badge tone="warn">{need.status}</Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt>Solicitado</dt><dd className="font-semibold">{need.quantityRequested}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt>Aprovado</dt><dd className="font-semibold">{need.quantityApproved}</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt>Cobertura</dt><dd className="font-semibold">{projection.coveragePercent}%</dd></div>
            <div className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3"><dt>Entregue</dt><dd className="font-semibold">{projection.deliveredPercent}%</dd></div>
          </dl>
          <div className="mt-4">
            <SourceStamp source={need} />
          </div>
          <h3 className="mt-5 font-semibold">Unidades relacionadas</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {units.slice(0, 6).map((unit) => (
              <li key={unit.id}>
                <InlineLink href={`/unidades/${unit.qrToken}`}>{unit.persistentCode}</InlineLink> - {unit.quantity} {unit.unit}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 font-semibold">Possiveis instrumentos publicos</h3>
          {possibleInstruments.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {possibleInstruments.map(({ link, instrument }) => (
                <li key={link.id} className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3">
                  <InlineLink href="/aquisicoes">{instrument?.reference}</InlineLink>
                  <p className="text-xs text-zinc-600">{link.justification}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Confianca manual: {Math.round((link.confidence ?? 0) * 100)}%</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">Nenhum vinculo manual com instrumento publico.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Trajetoria auditavel</h2>
          <Timeline events={timeline} />
        </Card>
      </div>
    </AppShell>
  );
}
