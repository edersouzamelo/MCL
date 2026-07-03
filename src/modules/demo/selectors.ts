import type { DemoState, LogisticsUnit, Need } from "@/modules/domain/types";
import { chronological, projectLogisticsUnit, projectNeed } from "@/modules/events/projection";

export function itemForVariant(state: DemoState, variantId: string) {
  const variant = state.itemVariants.find((itemVariant) => itemVariant.id === variantId);
  const item = variant ? state.supplyItems.find((supplyItem) => supplyItem.id === variant.itemId) : undefined;
  return { variant, item };
}

export function organizationName(state: DemoState, organizationId?: string) {
  return state.organizations.find((organization) => organization.id === organizationId)?.name ?? "Organizacao nao localizada";
}

export function locationName(state: DemoState, locationId?: string) {
  return state.locations.find((location) => location.id === locationId)?.name ?? "Localizacao nao localizada";
}

export function unitTimeline(state: DemoState, unit: LogisticsUnit) {
  return chronological(state.events.filter((event) => event.objectType === "LOGISTICS_UNIT" && event.objectId === unit.id));
}

export function needTimeline(state: DemoState, need: Need) {
  const linkedLotIds = state.objectLinks
    .filter((link) => link.fromType === "NEED" && link.fromId === need.id && link.toType === "LOT")
    .map((link) => link.toId);
  const linkedUnitIds = state.logisticsUnits.filter((unit) => linkedLotIds.includes(unit.lotId)).map((unit) => unit.id);
  return chronological(
    state.events.filter(
      (event) =>
        (event.objectType === "NEED" && event.objectId === need.id) ||
        (event.objectType === "LOGISTICS_UNIT" && linkedUnitIds.includes(event.objectId)) ||
        state.eventRelations.some(
          (relation) =>
            relation.eventId === event.id && relation.relatedObjectType === "NEED" && relation.relatedObjectId === need.id,
        ),
    ),
  );
}

export function passportForUnit(state: DemoState, unit: LogisticsUnit) {
  const { item, variant } = itemForVariant(state, unit.itemVariantId);
  const lot = state.lots.find((candidate) => candidate.id === unit.lotId);
  const need = lot
    ? state.needs.find((candidate) =>
        state.objectLinks.some(
          (link) =>
            link.fromType === "NEED" &&
            link.fromId === candidate.id &&
            link.toType === "LOT" &&
            link.toId === lot.id,
        ),
      )
    : undefined;
  const organization = need ? state.organizations.find((candidate) => candidate.id === need.organizationId) : undefined;
  const projection = projectLogisticsUnit(unit, state.events);
  const shipmentUnit = state.shipmentUnits.find((candidate) => candidate.logisticsUnitId === unit.id);
  const shipment = shipmentUnit ? state.shipments.find((candidate) => candidate.id === shipmentUnit.shipmentId) : undefined;
  const coverage = need ? state.needCoverages.find((candidate) => candidate.needId === need.id && candidate.creditId) : undefined;
  const credit = coverage?.creditId ? state.credits.find((candidate) => candidate.id === coverage.creditId) : undefined;
  const commitment = coverage?.commitmentId
    ? state.commitments.find((candidate) => candidate.id === coverage.commitmentId)
    : undefined;
  const instrument = commitment
    ? state.acquisitionInstruments.find((candidate) => candidate.id === commitment.acquisitionInstrumentId)
    : undefined;

  return {
    unit,
    item,
    variant,
    lot,
    need,
    organization,
    projection,
    shipment,
    credit,
    commitment,
    instrument,
    location: state.locations.find((candidate) => candidate.id === projection.locationId),
    timeline: unitTimeline(state, unit),
    divergences: state.divergences.filter((divergence) => divergence.objectId === unit.id),
  };
}

export function dashboardMetrics(state: DemoState) {
  const needs = state.needs.map((need) => ({ need, projection: projectNeed(need, state) }));
  const unitsByState = state.logisticsUnits.reduce<Record<string, number>>((acc, unit) => {
    const projection = projectLogisticsUnit(unit, state.events);
    acc[projection.state] = (acc[projection.state] ?? 0) + 1;
    return acc;
  }, {});
  const connectorIssues = state.connectors.filter((connector) => connector.status !== "SAUDAVEL").length;
  const manualAcquisitionLinks = state.objectLinks.filter(
    (link) =>
      link.fromType === "NEED" &&
      link.toType === "ACQUISITION_INSTRUMENT" &&
      link.relationType === "PODE_SER_ATENDIDA_POR",
  );
  const linkedNeedIds = new Set(manualAcquisitionLinks.map((link) => link.fromId));
  const now = Date.now();
  const inThirtyDays = now + 30 * 24 * 60 * 60 * 1000;
  const publicInstruments = state.acquisitionInstruments.filter((instrument) => instrument.sourceSystem === "COMPRAS_GOV");
  const currentPublicInstruments = publicInstruments.filter((instrument) => {
    const validFrom = new Date(instrument.validFrom).getTime();
    const validUntil = new Date(instrument.validUntil).getTime();
    return validFrom <= now && validUntil >= now && instrument.status !== "EXCLUIDO_NA_FONTE";
  });
  const expiringPublicInstruments = currentPublicInstruments.filter(
    (instrument) => new Date(instrument.validUntil).getTime() <= inThirtyDays,
  );
  const comprasGovConnector = state.connectors.find((connector) => connector.id === "compras-gov");
  const activeCatalogMappings = state.itemCatalogMappings.filter((mapping) => mapping.status === "ACTIVE");
  const needsWithCatmat = new Set(activeCatalogMappings.map((mapping) => mapping.needId).filter(Boolean));
  const needsWithPotentialAta = new Set(
    activeCatalogMappings
      .filter((mapping) =>
        state.acquisitionInstruments.some(
          (instrument) => instrument.sourceSystem === "COMPRAS_GOV" && instrument.itemCode === mapping.externalItemCode,
        ),
      )
      .map((mapping) => mapping.needId)
      .filter(Boolean),
  );
  const latestCoverageQuery = [...state.coverageQueries].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
  )[0];
  const staleCoverageNeedIds = new Set(
    state.coverageQueries
      .filter((query) => query.staleAt && new Date(query.staleAt).getTime() < now)
      .map((query) => query.needId),
  );

  return {
    needs,
    unitsByState,
    totalUnits: state.logisticsUnits.length,
    deliveredUnits: state.logisticsUnits.filter((unit) => projectLogisticsUnit(unit, state.events).state === "ENTREGUE").length,
    openDivergences: state.divergences.filter((divergence) => divergence.status !== "CORRIGIDA").length,
    connectorIssues,
    quarantineCount: state.quarantine.length,
    contractualCoverage: {
      needsWithPossibleInstrument: linkedNeedIds.size,
      needsWithoutInstrument: state.needs.length - linkedNeedIds.size,
      currentPublicInstruments: currentPublicInstruments.length,
      expiringPublicInstruments: expiringPublicInstruments.length,
      lastComprasGovSyncAt: comprasGovConnector?.lastSuccessAt ?? comprasGovConnector?.lastRunAt,
      sourceSystem: "COMPRAS_GOV",
    },
    acquisitionCoverage: {
      needsWithCatmat: needsWithCatmat.size,
      needsWithoutCatmat: state.needs.length - needsWithCatmat.size,
      needsWithPotentialAta: needsWithPotentialAta.size,
      needsWithoutResult: activeCatalogMappings.filter((mapping) => !needsWithPotentialAta.has(mapping.needId)).length,
      staleResults: staleCoverageNeedIds.size,
      lastQueryAt: latestCoverageQuery?.finishedAt,
      sourceSystem: "COMPRAS_GOV",
    },
  };
}
