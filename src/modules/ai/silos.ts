import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { searchOfficialCatalog } from "@/modules/coverage/official-catalog";
import type { Citation, MclAiActor, MclToolEnvelope } from "@/modules/ai/contracts";
import { getLatestFinancialSnapshotPair } from "@/modules/financial-snapshots/repository";

import { getLatestTgProjection, type TgDashboardProjection } from "@/modules/credits-tg/repository";

export const MCL_DATA_SILOS = [
  "NECESSIDADES",
  "COBERTURA",
  "RASTREABILIDADE",
  "DIVERGENCIAS",
  "CONECTORES",
  "AUDITORIA",
  "CREDITOS",
  "GRUPAMENTO",
] as const;

export type MclDataSilo = (typeof MCL_DATA_SILOS)[number];

type SiloStatus = {
  id: MclDataSilo | "ARQUITETURA" | "CATMAT";
  label: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "BLOCKED";
  nature: string;
  reason: string;
};

const DB_CITATION: Citation = {
  title: "Banco persistido do MCL",
  source: "MCL_POSTGRESQL",
  dataNature: "PERSISTED_OPERATIONAL",
};

function nowIso() {
  return new Date().toISOString();
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function unavailable<T>(gap: string, data: T): MclToolEnvelope<T> {
  return {
    status: "UNAVAILABLE",
    dataNature: "NONE",
    asOf: nowIso(),
    citations: [],
    gaps: [gap],
    data,
  };
}

function blocked<T>(gap: string, data: T): MclToolEnvelope<T> {
  return {
    status: "BLOCKED",
    dataNature: "NONE",
    asOf: nowIso(),
    citations: [],
    gaps: [gap],
    data,
  };
}

export function getSiloCatalog(databaseConfigured = Boolean(process.env.DATABASE_URL)): MclToolEnvelope<{
  silos: SiloStatus[];
}> {
  const dbStatus = databaseConfigured ? "AVAILABLE" : "UNAVAILABLE";
  const dbReason = databaseConfigured
    ? "Consulta somente leitura ao PostgreSQL, com exclusão explícita de objetos demonstrativos."
    : "DATABASE_URL não está configurada neste runtime; nenhum fallback em memória será usado pela IA.";

  return {
    status: "AVAILABLE",
    dataNature: "VERSIONED_KNOWLEDGE",
    asOf: nowIso(),
    citations: [
      {
        title: "Catálogo de ferramentas somente leitura do Assistente",
        source: "src/modules/ai/silos.ts",
        dataNature: "VERSIONED_KNOWLEDGE",
      },
    ],
    gaps: [
      "Disponibilidade de um silo não prova que ele contenha registros operacionais; cada consulta informa natureza, data e exclusões.",
    ],
    data: {
      silos: [
        { id: "ARQUITETURA", label: "Arquitetura e uso do MCL", status: "AVAILABLE", nature: "Conhecimento versionado", reason: "Base RAG local com referências ao repositório." },
        { id: "CATMAT", label: "CATMAT oficial", status: "AVAILABLE", nature: "Consulta oficial sob demanda", reason: "Leitura da API do Compras.gov.br; falhas e vazios são preservados." },
        { id: "NECESSIDADES", label: "Necessidades", status: dbStatus, nature: "Persistido", reason: dbReason },
        { id: "COBERTURA", label: "Cobertura e ARPs persistidas", status: dbStatus, nature: "Persistido/calculado", reason: dbReason },
        { id: "RASTREABILIDADE", label: "Rastreabilidade", status: dbStatus, nature: "Persistido", reason: dbReason },
        { id: "DIVERGENCIAS", label: "Divergências", status: dbStatus, nature: "Persistido", reason: dbReason },
        { id: "CONECTORES", label: "Saúde dos conectores", status: dbStatus, nature: "Persistido", reason: dbReason },
        { id: "AUDITORIA", label: "Auditoria", status: dbStatus, nature: "Persistido e restrito por perfil", reason: dbReason },
        { id: "CREDITOS", label: "Créditos/Tesouro Gerencial", status: dbStatus, nature: "Tesouro Gerencial via e-mail e Apps Script", reason: "Consulta TG própria; presença e semântica dos registros dependem da carga. SAG não alimenta Créditos." },
        { id: "GRUPAMENTO", label: "SAG/Centro de Comando", status: dbStatus, nature: "SAG importado e persistido", reason: dbReason },
      ],
    },
  };
}

async function allowedOrganizations(actor: MclAiActor) {
  if (!actor.organizationId) return [];
  const canSeeChildren = actor.roles.includes("ADMIN") || actor.roles.includes("LOGISTICS_MANAGER");
  return prisma.organization.findMany({
    where: canSeeChildren
      ? { synthetic: false, OR: [{ id: actor.organizationId }, { parentId: actor.organizationId }] }
      : { id: actor.organizationId, synthetic: false },
    select: { id: true, code: true, name: true, synthetic: true },
  });
}

function operationalNeedWhere(organizationIds: string[], search?: string): Prisma.NeedWhereInput {
  const normalizedSearch = search?.trim();
  return {
    organizationId: { in: organizationIds },
    organization: { synthetic: false },
    variant: { item: { synthetic: false } },
    NOT: [
      { sourceSystem: { startsWith: "SIM-" } },
      { authorityLevel: "DEMONSTRATIVO" },
    ],
    ...(normalizedSearch
      ? {
          OR: [
            { persistentCode: { contains: normalizedSearch, mode: "insensitive" } },
            { purpose: { contains: normalizedSearch, mode: "insensitive" } },
            { status: { contains: normalizedSearch, mode: "insensitive" } },
            { variant: { label: { contains: normalizedSearch, mode: "insensitive" } } },
            { variant: { item: { name: { contains: normalizedSearch, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

async function queryNeeds(actor: MclAiActor, search: string | undefined, limit: number) {
  const organizations = await allowedOrganizations(actor);
  const organizationIds = organizations.map((organization) => organization.id);
  if (!organizationIds.length) {
    return unavailable("O usuário não possui organização autorizada localizável no banco.", { records: [], operationalCount: 0, excludedCount: 0 });
  }

  const where = operationalNeedWhere(organizationIds, search);
  const allAuthorizedWhere: Prisma.NeedWhereInput = {
    organizationId: { in: organizationIds },
    ...(search?.trim()
      ? {
          OR: [
            { persistentCode: { contains: search.trim(), mode: "insensitive" } },
            { purpose: { contains: search.trim(), mode: "insensitive" } },
            { status: { contains: search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [records, operationalCount, authorizedCount] = await Promise.all([
    prisma.need.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { organization: true, variant: { include: { item: true } } },
    }),
    prisma.need.count({ where }),
    prisma.need.count({ where: allAuthorizedWhere }),
  ]);
  const asOf = records[0]?.updatedAt.toISOString() ?? nowIso();

  return {
    status: "AVAILABLE" as const,
    dataNature: "PERSISTED_OPERATIONAL" as const,
    asOf,
    citations: [{ ...DB_CITATION, asOf }],
    gaps: authorizedCount > operationalCount
      ? [`${authorizedCount - operationalCount} registro(s) demonstrativo(s) ou sintético(s) foram excluídos da resposta.`]
      : [],
    data: {
      operationalCount,
      excludedCount: Math.max(authorizedCount - operationalCount, 0),
      organizations: organizations.map(({ id, code, name }) => ({ id, code, name })),
      records: records.map((record) => ({
        id: record.id,
        persistentCode: record.persistentCode,
        organization: record.organization.name,
        item: record.variant.item.name,
        variant: record.variant.label,
        quantityRequested: record.quantityRequested,
        quantityApproved: record.quantityApproved,
        priority: record.priority,
        requiredAt: record.requiredAt.toISOString(),
        purpose: record.purpose,
        status: record.status,
        sourceSystem: record.sourceSystem,
        sourceRecordId: record.sourceRecordId,
        dataNature: record.dataNature,
        occurredAt: record.occurredAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      })),
    },
  };
}

async function operationalNeedIds(actor: MclAiActor, search?: string) {
  const organizations = await allowedOrganizations(actor);
  if (!organizations.length) return { organizations, needIds: [] as string[] };
  const needs = await prisma.need.findMany({
    where: operationalNeedWhere(organizations.map((organization) => organization.id), search),
    select: { id: true },
    take: 200,
  });
  return { organizations, needIds: needs.map((need) => need.id) };
}

async function queryCoverage(actor: MclAiActor, search: string | undefined, limit: number) {
  const { needIds } = await operationalNeedIds(actor, search);
  if (!needIds.length) {
    return {
      status: "AVAILABLE" as const,
      dataNature: "CALCULATED_FROM_PERSISTED" as const,
      asOf: nowIso(),
      citations: [{ ...DB_CITATION, asOf: nowIso() }],
      gaps: ["Nenhuma necessidade operacional autorizada foi localizada; objetos demonstrativos não foram usados."],
      data: { analyses: [], mappings: [], arpUnits: [] },
    };
  }

  const [analyses, mappings, arpUnits] = await Promise.all([
    prisma.materialCoverageAnalysis.findMany({ where: { needId: { in: needIds } }, orderBy: { updatedAt: "desc" }, take: limit }),
    prisma.itemCatalogMapping.findMany({ where: { needId: { in: needIds }, status: "ACTIVE" }, orderBy: { confirmedAt: "desc" }, take: limit }),
    prisma.arpUnitRecord.findMany({ where: { needId: { in: needIds } }, orderBy: { fetchedAt: "desc" }, take: limit }),
  ]);
  const latestDates = [
    ...analyses.map((item) => item.updatedAt),
    ...mappings.map((item) => item.confirmedAt),
    ...arpUnits.map((item) => item.fetchedAt),
  ].sort((left, right) => right.getTime() - left.getTime());
  const asOf = latestDates[0]?.toISOString() ?? nowIso();
  const sourceCitations = new Map<string, Citation>();
  sourceCitations.set("db", { ...DB_CITATION, asOf });
  for (const record of arpUnits) {
    sourceCitations.set(record.sourceUrl, {
      title: `Ata ${record.numeroAta}`,
      source: "COMPRAS_GOV",
      url: safeHttpUrl(record.sourceUrl),
      asOf: (record.sourceUpdatedAt ?? record.fetchedAt).toISOString(),
      dataNature: "LIVE_OFFICIAL",
    });
  }

  return {
    status: "AVAILABLE" as const,
    dataNature: "CALCULATED_FROM_PERSISTED" as const,
    asOf,
    citations: [...sourceCitations.values()].slice(0, 12),
    gaps: arpUnits.length ? [] : ["Não há unidades de ARP persistidas para as necessidades operacionais autorizadas."],
    data: {
      analyses: analyses.map((analysis) => ({
        id: analysis.id,
        needId: analysis.needId,
        status: analysis.status,
        requestedQuantity: analysis.requestedQuantity,
        deficitQuantity: analysis.deficitQuantity,
        availableStockQuantity: analysis.availableStockQuantity,
        reservedQuantity: analysis.reservedQuantity,
        deliveredQuantity: analysis.deliveredQuantity,
        completedAt: analysis.completedAt?.toISOString(),
        lastRefreshAt: analysis.lastRefreshAt?.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
      })),
      mappings: mappings.map((mapping) => ({
        id: mapping.id,
        needId: mapping.needId,
        catalog: mapping.externalCatalog,
        code: mapping.externalItemCode,
        description: mapping.externalDescription,
        confirmedAt: mapping.confirmedAt.toISOString(),
        justification: mapping.justification,
        status: mapping.status,
      })),
      arpUnits: arpUnits.map((record) => ({
        needId: record.needId,
        numeroAta: record.numeroAta,
        unidadeGerenciadora: record.unidadeGerenciadora,
        numeroItem: record.numeroItem,
        nomeUnidade: record.nomeUnidade,
        fornecedor: record.fornecedor,
        quantidadeRegistrada: record.quantidadeRegistrada === null ? undefined : Number(record.quantidadeRegistrada),
        saldoAdesoes: record.saldoAdesoes === null ? undefined : Number(record.saldoAdesoes),
        aceitaAdesao: record.aceitaAdesao,
        sourceUrl: record.sourceUrl,
        sourceUpdatedAt: record.sourceUpdatedAt?.toISOString(),
        fetchedAt: record.fetchedAt.toISOString(),
      })),
    },
  };
}

async function queryTraceability(actor: MclAiActor, limit: number) {
  const organizations = await allowedOrganizations(actor);
  const locationRows = await prisma.location.findMany({
    where: { organizationId: { in: organizations.map((organization) => organization.id) }, synthetic: false },
    select: { id: true, name: true },
  });
  const units = await prisma.logisticsUnit.findMany({
    where: {
      currentLocationId: { in: locationRows.map((location) => location.id) },
      active: true,
      NOT: { sourceSystem: { startsWith: "SIM-" } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  const asOf = units[0]?.updatedAt.toISOString() ?? nowIso();
  return {
    status: "AVAILABLE" as const,
    dataNature: "PERSISTED_OPERATIONAL" as const,
    asOf,
    citations: [{ ...DB_CITATION, asOf }],
    gaps: units.length ? [] : ["Nenhuma unidade logística operacional foi localizada; locais e fontes sintéticos foram excluídos."],
    data: {
      locations: locationRows,
      units: units.map((unit) => ({
        id: unit.id,
        persistentCode: unit.persistentCode,
        lotId: unit.lotId,
        quantity: unit.quantity,
        unit: unit.unit,
        currentState: unit.currentState,
        currentLocationId: unit.currentLocationId,
        condition: unit.condition,
        dataNature: unit.dataNature,
        sourceSystem: unit.sourceSystem,
        sourceRecordId: unit.sourceRecordId,
        occurredAt: unit.occurredAt.toISOString(),
        updatedAt: unit.updatedAt.toISOString(),
      })),
    },
  };
}

async function queryDivergences(actor: MclAiActor, limit: number) {
  const { needIds } = await operationalNeedIds(actor);
  const traceability = await queryTraceability(actor, 200);
  const unitIds = traceability.data.units.map((unit) => unit.id);
  const authorizedObjectIds = [...needIds, ...unitIds];
  const divergences = authorizedObjectIds.length
    ? await prisma.divergence.findMany({
        where: { objectId: { in: authorizedObjectIds } },
        orderBy: { detectedAt: "desc" },
        take: limit,
      })
    : [];
  const asOf = divergences[0]?.detectedAt.toISOString() ?? nowIso();
  return {
    status: "AVAILABLE" as const,
    dataNature: "PERSISTED_OPERATIONAL" as const,
    asOf,
    citations: [{ ...DB_CITATION, asOf }],
    gaps: divergences.length ? [] : ["Nenhuma divergência vinculada a objetos operacionais autorizados foi localizada."],
    data: {
      records: divergences.map((record) => ({
        id: record.id,
        persistentCode: record.persistentCode,
        title: record.title,
        severity: record.severity,
        status: record.status,
        objectType: record.objectType,
        objectId: record.objectId,
        expected: record.expected,
        observed: record.observed,
        sourceSystem: record.sourceSystem,
        sourceRecordId: record.sourceRecordId,
        detectedAt: record.detectedAt.toISOString(),
      })),
    },
  };
}

async function queryConnectors(limit: number) {
  const records = await prisma.connectorHealth.findMany({
    where: { NOT: { sourceSystem: { startsWith: "SIM-" } } },
    orderBy: { lastRunAt: "desc" },
    take: limit,
  });
  const asOf = records[0]?.lastRunAt.toISOString() ?? nowIso();
  return {
    status: "AVAILABLE" as const,
    dataNature: "PERSISTED_OPERATIONAL" as const,
    asOf,
    citations: [{ ...DB_CITATION, asOf }],
    gaps: records.length ? [] : ["Nenhum estado operacional de conector foi localizado; registros simulados foram excluídos."],
    data: {
      records: records.map((record) => ({
        name: record.name,
        sourceSystem: record.sourceSystem,
        status: record.status,
        lastRunAt: record.lastRunAt.toISOString(),
        lastSuccessAt: record.lastSuccessAt?.toISOString(),
        recordsRead: record.recordsRead,
        acceptedRecords: record.acceptedRecords,
        rejectedRecords: record.rejectedRecords,
        quarantinedRecords: record.quarantinedRecords,
        message: record.message,
      })),
    },
  };
}

async function queryAudit(actor: MclAiActor, limit: number) {
  const allowed = actor.roles.some((role) => ["ADMIN", "AUDITOR", "LOGISTICS_MANAGER"].includes(role));
  if (!allowed) {
    return blocked("O perfil atual não pode consultar o silo de auditoria.", { records: [] });
  }
  const organizations = await allowedOrganizations(actor);
  const records = await prisma.auditLog.findMany({
    where: { organizationId: { in: organizations.map((organization) => organization.id) } },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
  const asOf = records[0]?.occurredAt.toISOString() ?? nowIso();
  return {
    status: "AVAILABLE" as const,
    dataNature: "PERSISTED_OPERATIONAL" as const,
    asOf,
    citations: [{ ...DB_CITATION, asOf }],
    gaps: records.length ? [] : ["Nenhum evento de auditoria foi localizado para o escopo organizacional autorizado."],
    data: {
      records: records.map((record) => ({
        occurredAt: record.occurredAt.toISOString(),
        action: record.action,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        outcome: record.outcome,
        reason: record.reason,
      })),
    },
  };
}

async function queryFinancial(actor: MclAiActor, search: string | undefined, limit: number) {
  if (!actor.organizationId) return unavailable("O usuário não possui organização associada.", { current: null, rpn: null });
  const pair = await getLatestFinancialSnapshotPair(actor.organizationId);
  if (!pair.current && !pair.rpn) {
    return unavailable("Nenhuma carga SAG persistida foi localizada para a organização do usuário.", { current: null, rpn: null });
  }

  const normalized = search?.trim().toLocaleLowerCase("pt-BR");
  const filter = <T extends { pi: string; piName?: string }>(records: T[]) => records
    .filter((record) => !normalized || `${record.pi} ${record.piName ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalized))
    .slice(0, limit);
  const dates = [pair.current?.persistedAt, pair.rpn?.persistedAt].filter((value): value is string => Boolean(value)).sort();
  const citations: Citation[] = [];
  if (pair.current) citations.push({ title: pair.current.source.fileName, source: "SAG_EXERCICIO_CORRENTE", asOf: pair.current.persistedAt, dataNature: "PERSISTED_OPERATIONAL" });
  if (pair.rpn) citations.push({ title: pair.rpn.source.fileName, source: "SAG_RPNP", asOf: pair.rpn.persistedAt, dataNature: "PERSISTED_OPERATIONAL" });

  return {
    status: "AVAILABLE" as const,
    dataNature: "PERSISTED_OPERATIONAL" as const,
    asOf: dates.at(-1) ?? nowIso(),
    citations,
    gaps: [
      ...(!pair.current ? ["Exercício Corrente ausente."] : []),
      ...(!pair.rpn ? ["RPNP ausente."] : []),
      ...(normalized && pair.current && filter(pair.current.byPi).length === 0 ? [`Nenhum PI do Exercício Corrente corresponde a '${search}'.`] : []),
    ],
    data: {
      current: pair.current ? {
        fileName: pair.current.source.fileName,
        persistedAt: pair.current.persistedAt,
        checksum: pair.current.checksum,
        rowCount: pair.current.rows.length,
        totals: pair.current.totals,
        byPi: filter(pair.current.byPi),
        warnings: pair.current.warnings,
      } : null,
      rpn: pair.rpn ? {
        fileName: pair.rpn.source.fileName,
        persistedAt: pair.rpn.persistedAt,
        checksum: pair.rpn.checksum,
        rowCount: pair.rpn.rows.length,
        totals: pair.rpn.totals,
        byPi: filter(pair.rpn.byPi),
        warnings: pair.rpn.warnings,
      } : null,
    },
  };
}

export function projectCreditsForAssistant(
  projection: TgDashboardProjection,
  search: string | undefined,
  limit: number,
) {
  const normalized = search?.trim().toLocaleLowerCase("pt-BR");
  const matchingUgs = projection.operational.ugOptions.filter((option) =>
    !normalized || `${option.ug} ${option.om}`.toLocaleLowerCase("pt-BR").includes(normalized)
  );
  const allowedUgs = new Set(matchingUgs.map((option) => option.ug));
  const ncRows = projection.operational.ncMovements.filter((row) => !normalized || allowedUgs.has(row.ug));
  const neRows = projection.operational.neExecution.filter((row) => !normalized || allowedUgs.has(row.ug));
  const rpnpRows = projection.operational.rpnpMovements.filter((row) => !normalized || allowedUgs.has(row.ug));
  const byUg = matchingUgs.map((option) => {
    const ugNcs = projection.operational.ncMovements.filter((row) => row.ug === option.ug);
    const ugNes = projection.operational.neExecution.filter((row) => row.ug === option.ug);
    const ugRpnps = projection.operational.rpnpMovements.filter((row) => row.ug === option.ug);
    const provisionUpdatedCents = ugNcs.reduce((sum, row) => sum + row.provisionUpdatedCents, 0);
    const committedCents = ugNes.reduce((sum, row) => sum + row.committedCents, 0);
    return {
      ug: option.ug,
      om: option.om,
      provisionUpdatedCents,
      committedCents,
      availableCreditCents: provisionUpdatedCents - committedCents,
      liquidatedCents: ugNes.reduce((sum, row) => sum + row.liquidatedCents, 0),
      committedToLiquidateCents: ugNes.reduce((sum, row) => sum + row.committedToLiquidateCents, 0),
      paidCents: ugNes.reduce((sum, row) => sum + row.paidCents, 0),
      rpnpRegisteredAndReinscribedCents: ugRpnps.reduce((sum, row) => sum + row.registeredCents + row.reinscribedCents, 0),
      rpnpToLiquidateCents: ugRpnps.reduce((sum, row) => sum + row.toLiquidateCents, 0),
      ncCount: ugNcs.length,
      neCount: ugNes.length,
      rpnpCount: ugRpnps.length,
    };
  }).slice(0, limit);
  const provisionUpdatedCents = ncRows.reduce((sum, row) => sum + row.provisionUpdatedCents, 0);
  const committedCents = neRows.reduce((sum, row) => sum + row.committedCents, 0);

  return {
    source: {
      fileName: projection.snapshot.fileName,
      importedAt: projection.snapshot.importedAt,
      emailReceivedAt: projection.snapshot.emailReceivedAt,
      rowCount: projection.snapshot.rowCount,
      checksum: projection.snapshot.checksum,
    },
    scope: normalized ? { search, matchedUgs: matchingUgs.length } : { search: null, matchedUgs: matchingUgs.length },
    totals: {
      provisionUpdatedCents,
      committedCents,
      availableCreditCents: provisionUpdatedCents - committedCents,
      liquidatedCents: neRows.reduce((sum, row) => sum + row.liquidatedCents, 0),
      committedToLiquidateCents: neRows.reduce((sum, row) => sum + row.committedToLiquidateCents, 0),
      paidCents: neRows.reduce((sum, row) => sum + row.paidCents, 0),
      rpnpRegisteredAndReinscribedCents: rpnpRows.reduce((sum, row) => sum + row.registeredCents + row.reinscribedCents, 0),
      rpnpLiquidatedCents: rpnpRows.reduce((sum, row) => sum + row.liquidatedCents, 0),
      rpnpCancelledCents: rpnpRows.reduce((sum, row) => sum + row.cancelledCents, 0),
      rpnpToLiquidateCents: rpnpRows.reduce((sum, row) => sum + row.toLiquidateCents, 0),
    },
    byUg,
  };
}

export type AssistantCreditProjection = ReturnType<typeof projectCreditsForAssistant>;

export type CreditAnalyticsInput = {
  ug?: string;
  nd?: string;
  pi?: string;
  search?: string;
  metric?: "AVAILABLE" | "PROVISION" | "COMMITTED" | "LIQUIDATED" | "TO_LIQUIDATE" | "PAID"
    | "RPNP_REGISTERED_TOTAL" | "RPNP_REGISTERED" | "RPNP_REINSCRIBED" | "RPNP_CANCELLED"
    | "RPNP_TO_LIQUIDATE" | "RPNP_LIQUIDATED" | "RPNP_LIQUIDATED_TO_PAY" | "RPNP_PAID" | "RPNP_PAYABLE";
  groupBy?: "TOTAL" | "UG" | "ND" | "PI" | "NE";
  sort?: "VALUE_DESC" | "VALUE_ASC";
  includeFinalities?: boolean;
  limit?: number;
};

const normalizeCreditText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/\b9[ºo]?\b/g, "9")
  .replace(/\bb\s*sup\b|\bbsup\b/g, "batalhao de suprimento")
  .replace(/\bgpt\s*log\b/g, "grupamento logistico")
  .replace(/\bb\s*mnt\b/g, "batalhao de manutencao")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const creditSum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + value(row), 0);

function matchesCreditUg(option: { ug: string; om: string }, query?: string) {
  if (!query?.trim()) return true;
  const normalizedQuery = normalizeCreditText(query);
  const normalizedOption = normalizeCreditText(`${option.ug} ${option.om}`);
  const queryTokens = normalizedQuery.split(" ").filter((token) => token.length > 1);
  return normalizedOption.includes(normalizedQuery) || queryTokens.every((token) => normalizedOption.includes(token));
}

function matchesCreditNd(value: string, query?: string) {
  if (!query?.trim()) return true;
  const digits = query.replace(/\D/g, "");
  if (!digits) return normalizeCreditText(value).includes(normalizeCreditText(query));
  if (digits.length === 2) return value.replace(/\D/g, "").slice(4, 6) === digits;
  return value.replace(/\D/g, "").startsWith(digits);
}

function matchesCreditPi(value: string, query?: string) {
  return !query?.trim() || normalizeCreditText(value).includes(normalizeCreditText(query));
}

function matchesCreditSearch(
  row: {
    ne: string;
    supplier: string;
    nd: string;
    ndDescription: string;
    description: string;
    processNumber: string;
    biddingModality: string;
  },
  query?: string,
) {
  if (!query?.trim()) return true;
  const haystack = normalizeCreditText([
    row.ne,
    row.supplier,
    row.nd,
    row.ndDescription,
    row.description,
    row.processNumber,
    row.biddingModality,
  ].join(" "));
  const tokens = normalizeCreditText(query).split(" ").filter((token) => token.length > 1);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

function creditMetricValue(
  value: {
    provisionUpdatedCents: number;
    availableCreditCents: number;
    committedCents: number;
    liquidatedCents: number;
    committedToLiquidateCents: number;
    paidCents: number;
  },
  metric: NonNullable<CreditAnalyticsInput["metric"]>,
) {
  if (metric === "PROVISION") return value.provisionUpdatedCents;
  if (metric === "COMMITTED") return value.committedCents;
  if (metric === "LIQUIDATED") return value.liquidatedCents;
  if (metric === "TO_LIQUIDATE") return value.committedToLiquidateCents;
  if (metric === "PAID") return value.paidCents;
  return value.availableCreditCents;
}

type RpnpMetric = Extract<NonNullable<CreditAnalyticsInput["metric"]>, `RPNP_${string}`>;

function rpnpMetricValue(
  value: {
    registeredCents: number;
    reinscribedCents: number;
    cancelledCents: number;
    toLiquidateCents: number;
    liquidatedCents: number;
    liquidatedToPayCents: number;
    paidCents: number;
    payableCents: number;
  },
  metric: RpnpMetric,
) {
  if (metric === "RPNP_REGISTERED_TOTAL") return value.registeredCents + value.reinscribedCents;
  if (metric === "RPNP_REGISTERED") return value.registeredCents;
  if (metric === "RPNP_REINSCRIBED") return value.reinscribedCents;
  if (metric === "RPNP_CANCELLED") return value.cancelledCents;
  if (metric === "RPNP_TO_LIQUIDATE") return value.toLiquidateCents;
  if (metric === "RPNP_LIQUIDATED") return value.liquidatedCents;
  if (metric === "RPNP_LIQUIDATED_TO_PAY") return value.liquidatedToPayCents;
  if (metric === "RPNP_PAID") return value.paidCents;
  return value.payableCents;
}

function projectRpnpAnalytics(
  projection: TgDashboardProjection,
  input: CreditAnalyticsInput,
  matchingUgs: TgDashboardProjection["operational"]["ugOptions"],
  metric: RpnpMetric,
  limit: number,
) {
  const allowedUgs = new Set(matchingUgs.map((option) => option.ug));
  const rows = projection.operational.rpnpMovements.filter((row) =>
    allowedUgs.has(row.ug)
    && matchesCreditNd(row.nd, input.nd)
    && matchesCreditPi(row.pi, input.pi)
    && (!input.search || matchesCreditSearch({
      ne: row.ne,
      supplier: row.supplier,
      nd: row.nd,
      ndDescription: "",
      description: "",
      processNumber: "",
      biddingModality: "",
    }, input.search))
  );
  const summarize = (scoped: typeof rows) => ({
    registeredCents: creditSum(scoped, (row) => row.registeredCents),
    reinscribedCents: creditSum(scoped, (row) => row.reinscribedCents),
    cancelledCents: creditSum(scoped, (row) => row.cancelledCents),
    toLiquidateCents: creditSum(scoped, (row) => row.toLiquidateCents),
    liquidatedCents: creditSum(scoped, (row) => row.liquidatedCents),
    liquidatedToPayCents: creditSum(scoped, (row) => row.liquidatedToPayCents),
    paidCents: creditSum(scoped, (row) => row.paidCents),
    payableCents: creditSum(scoped, (row) => row.payableCents),
    neCount: scoped.length,
    ncCount: 0,
  });
  const groupBy = input.groupBy ?? "TOTAL";
  const groupKeys = new Map<string, { key: string; label: string }>();
  if (groupBy === "UG") matchingUgs.forEach((option) => groupKeys.set(option.ug, { key: option.ug, label: `${option.ug}: ${option.om}` }));
  else if (groupBy === "ND") rows.forEach((row) => groupKeys.set(row.nd, { key: row.nd, label: row.nd }));
  else if (groupBy === "PI") rows.forEach((row) => groupKeys.set(row.pi, { key: row.pi, label: row.pi }));
  else if (groupBy === "NE") rows.forEach((row) => groupKeys.set(row.id, { key: row.id, label: `${row.ne}: ${row.supplier}` }));
  else groupKeys.set("TOTAL", { key: "TOTAL", label: "Total do filtro" });

  const groups = [...groupKeys.values()].map((group) => {
    const scoped = groupBy === "TOTAL" ? rows : rows.filter((row) =>
      groupBy === "NE" ? row.id === group.key : row[groupBy === "UG" ? "ug" : groupBy === "ND" ? "nd" : "pi"] === group.key
    );
    const summary = summarize(scoped);
    const ne = groupBy === "NE" ? scoped[0] : undefined;
    return {
      ...group,
      ...summary,
      metricValueCents: rpnpMetricValue(summary, metric),
      ...(ne ? { ug: ne.ug, om: ne.om, ne: ne.ne, date: ne.date, supplier: ne.supplier, nd: ne.nd, pi: ne.pi } : {}),
    };
  }).sort((left, right) => (input.sort === "VALUE_ASC" ? 1 : -1) * (left.metricValueCents - right.metricValueCents)).slice(0, limit);
  const totals = summarize(rows);
  return {
    source: { fileName: projection.snapshot.fileName, importedAt: projection.snapshot.importedAt, rowCount: projection.snapshot.rowCount, checksum: projection.snapshot.checksum },
    filters: { ug: input.ug ?? null, nd: input.nd ?? null, pi: input.pi ?? null, search: input.search ?? null, matchedUgs: matchingUgs },
    metric,
    totals: { ...totals, metricValueCents: rpnpMetricValue(totals, metric) },
    groupBy,
    groups,
    finalities: [],
    interpretationNotes: [
      "Inscrito e reinscrito são movimentos distintos e são apresentados separadamente quando a pergunta pede o total inscrito em restos a pagar.",
      "Os valores de RPNP são filtrados diretamente por UG Executora, ND, PI e NE na projeção persistida do Tesouro Gerencial.",
    ],
  };
}

export function projectCreditAnalytics(
  projection: TgDashboardProjection,
  input: CreditAnalyticsInput,
) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const matchingUgs = projection.operational.ugOptions.filter((option) => matchesCreditUg(option, input.ug));
  const metric = input.metric ?? "AVAILABLE";
  if (metric.startsWith("RPNP_")) {
    return projectRpnpAnalytics(projection, input, matchingUgs, metric as RpnpMetric, limit);
  }
  const allowedUgs = new Set(matchingUgs.map((option) => option.ug));
  const ncRows = projection.operational.ncMovements.filter((row) =>
    allowedUgs.has(row.ug) && matchesCreditNd(row.nd, input.nd) && matchesCreditPi(row.pi, input.pi)
  );
  const neRows = projection.operational.neExecution.filter((row) =>
    allowedUgs.has(row.ug) && matchesCreditNd(row.nd, input.nd) && matchesCreditPi(row.pi, input.pi) && matchesCreditSearch(row, input.search)
  );

  const summarize = (
    scopedNcs: typeof ncRows,
    scopedNes: typeof neRows,
  ) => {
    const provisionUpdatedCents = creditSum(scopedNcs, (row) => row.provisionUpdatedCents);
    const committedCents = creditSum(scopedNes, (row) => row.committedCents);
    const reportedAvailableCreditCents = creditSum(scopedNcs, (row) => row.availableCreditCents);
    const availableCreditCents = provisionUpdatedCents - committedCents;
    return {
      provisionUpdatedCents,
      committedCents,
      availableCreditCents,
      reportedAvailableCreditCents,
      availableReconciliationCents: reportedAvailableCreditCents - availableCreditCents,
      liquidatedCents: creditSum(scopedNes, (row) => row.liquidatedCents),
      committedToLiquidateCents: creditSum(scopedNes, (row) => row.committedToLiquidateCents),
      paidCents: creditSum(scopedNes, (row) => row.paidCents),
      ncCount: scopedNcs.length,
      neCount: scopedNes.length,
    };
  };

  const groupBy = input.groupBy ?? "TOTAL";
  const groupKeys = new Map<string, { key: string; label: string }>();
  const registerGroup = (key: string, label: string) => groupKeys.set(key, { key, label });
  if (groupBy === "UG") {
    matchingUgs.forEach((option) => registerGroup(option.ug, `${option.ug}: ${option.om}`));
  } else if (groupBy === "ND") {
    [...ncRows, ...neRows].forEach((row) => registerGroup(row.nd, row.nd));
  } else if (groupBy === "PI") {
    [...ncRows, ...neRows].forEach((row) => registerGroup(row.pi, row.pi));
  } else if (groupBy === "NE") {
    neRows.forEach((row) => registerGroup(row.id, `${row.ne}: ${row.description}`));
  } else {
    registerGroup("TOTAL", "Total do filtro");
  }

  const groups = [...groupKeys.values()].map((group) => {
    const groupNcs = groupBy === "TOTAL" || groupBy === "NE" ? (groupBy === "TOTAL" ? ncRows : []) : ncRows.filter((row) => row[groupBy === "UG" ? "ug" : groupBy === "ND" ? "nd" : "pi"] === group.key);
    const groupNes = groupBy === "TOTAL" ? neRows : groupBy === "NE" ? neRows.filter((row) => row.id === group.key) : neRows.filter((row) => row[groupBy === "UG" ? "ug" : groupBy === "ND" ? "nd" : "pi"] === group.key);
    const summary = summarize(groupNcs, groupNes);
    const ne = groupBy === "NE" ? groupNes[0] : undefined;
    return {
      ...group,
      ...summary,
      metricValueCents: creditMetricValue(summary, metric),
      ...(ne ? {
        ug: ne.ug,
        om: ne.om,
        ne: ne.ne,
        date: ne.date,
        supplier: ne.supplier,
        nd: ne.nd,
        ndDescription: ne.ndDescription,
        description: ne.description,
        pi: ne.pi,
        processNumber: ne.processNumber,
        biddingModality: ne.biddingModality,
      } : {}),
    };
  }).sort((left, right) => (input.sort === "VALUE_ASC" ? 1 : -1) * (creditMetricValue(left, metric) - creditMetricValue(right, metric))).slice(0, limit);

  const purposeGroups = new Map<string, {
    purpose: string;
    action: string;
    ro: string;
    pi: string;
    nd: string;
    provisionUpdatedCents: number;
    ncCount: number;
  }>();
  for (const row of ncRows) {
    const key = [row.purpose, row.action, row.ro, row.pi, row.nd].join("|");
    const current = purposeGroups.get(key);
    purposeGroups.set(key, {
      purpose: row.purpose,
      action: row.action,
      ro: row.ro,
      pi: row.pi,
      nd: row.nd,
      provisionUpdatedCents: (current?.provisionUpdatedCents ?? 0) + row.provisionUpdatedCents,
      ncCount: (current?.ncCount ?? 0) + 1,
    });
  }

  return {
    source: {
      fileName: projection.snapshot.fileName,
      importedAt: projection.snapshot.importedAt,
      rowCount: projection.snapshot.rowCount,
      checksum: projection.snapshot.checksum,
    },
    filters: {
      ug: input.ug ?? null,
      nd: input.nd ?? null,
      pi: input.pi ?? null,
      search: input.search ?? null,
      matchedUgs: matchingUgs,
    },
    metric,
    totals: {
      ...summarize(ncRows, neRows),
      metricValueCents: creditMetricValue(summarize(ncRows, neRows), metric),
    },
    groupBy,
    groups,
    finalities: input.includeFinalities
      ? [...purposeGroups.values()]
        .sort((left, right) => right.provisionUpdatedCents - left.provisionUpdatedCents)
        .slice(0, limit)
      : [],
    interpretationNotes: [
      "Crédito disponível é calculado como provisão atualizada menos despesa empenhada no mesmo filtro de UASG, ND e PI.",
      "O valor calculado é comparado ao Item Informação 19 no mesmo filtro; availableReconciliationCents informa eventual divergência.",
      "Finalidade vem da descrição da NC. O saldo disponível não é rateado por finalidade quando compromissos distintos compartilham UASG, PI e ND.",
      "UG Executora não é convertida em OM beneficiária por inferência.",
    ],
  };
}

export async function queryTgCreditAnalytics(
  actor: MclAiActor,
  input: CreditAnalyticsInput,
): Promise<MclToolEnvelope<unknown>> {
  if (!process.env.DATABASE_URL) {
    return unavailable("DATABASE_URL não está configurada. O Assistente não usa dados demonstrativos.", { records: [] });
  }
  if (!actor.organizationId) return unavailable("Organização ausente.", { records: [] });
  const projection = await getLatestTgProjection(actor.organizationId);
  if (!projection) return unavailable("Nenhuma projeção TG persistida para esta organização.", { records: [] });
  const data = projectCreditAnalytics(projection, input);
  const gaps = [
    ...(input.ug && data.filters.matchedUgs.length === 0 ? [`Nenhuma UASG corresponde ao filtro '${input.ug}'.`] : []),
    ...(input.search && data.totals.neCount === 0
      ? [input.metric?.startsWith("RPNP_")
        ? "Nenhum movimento de RPNP contém o termo pesquisado nos identificadores disponíveis."
        : "Nenhuma NE do exercício corrente contém o termo pesquisado nos campos descritivos disponíveis."]
      : []),
    ...((input.nd || input.pi) && data.totals.ncCount === 0 && data.totals.neCount === 0
      ? ["Nenhum movimento contábil corresponde à combinação de filtros informada."]
      : []),
  ];
  return {
    status: "AVAILABLE",
    dataNature: "CALCULATED_FROM_PERSISTED",
    asOf: projection.snapshot.importedAt,
    citations: [{
      title: projection.snapshot.fileName,
      source: "TESOURO_GERENCIAL",
      dataNature: "PERSISTED_OPERATIONAL",
      asOf: projection.snapshot.importedAt,
    }],
    gaps,
    data,
  };
}

export async function queryMclData(
  actor: MclAiActor,
  input: { silo: MclDataSilo; search?: string; limit?: number },
): Promise<MclToolEnvelope<unknown>> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);

  if (!process.env.DATABASE_URL) {
    return unavailable(
      "DATABASE_URL não está configurada. O Assistente não usa DemoState nem auto-seed como fonte operacional.",
      { records: [] },
    );
  }

  switch (input.silo) {
    case "CREDITOS":
      if (!actor.organizationId) return unavailable("Organização ausente.", { records: [] });
      const tg = await getLatestTgProjection(actor.organizationId);
      if (!tg) return unavailable("Nenhuma projeção TG persistida para esta organização. A fonte é TG por e-mail/Apps Script; importar SAG no CCO não preenche Créditos.", { records: [] });
      const data = projectCreditsForAssistant(tg, input.search, limit);
      return { status: "AVAILABLE", dataNature: "CALCULATED_FROM_PERSISTED", asOf: tg.snapshot.importedAt,
        citations: [{ title: tg.snapshot.fileName, source: "TESOURO_GERENCIAL", dataNature: "PERSISTED_OPERATIONAL", asOf: tg.snapshot.importedAt }],
        gaps: [...tg.snapshot.warnings, ...(input.search && data.scope.matchedUgs === 0 ? [`Nenhuma UASG/OM corresponde a '${input.search}'.`] : [])],
        data };
    case "GRUPAMENTO":
      return queryFinancial(actor, input.search, limit);
    case "NECESSIDADES":
      return queryNeeds(actor, input.search, limit);
    case "COBERTURA":
      return queryCoverage(actor, input.search, limit);
    case "RASTREABILIDADE":
      return queryTraceability(actor, limit);
    case "DIVERGENCIAS":
      return queryDivergences(actor, limit);
    case "CONECTORES":
      return queryConnectors(limit);
    case "AUDITORIA":
      return queryAudit(actor, limit);
  }
}

export async function queryOfficialCatmat(
  query: string,
  requestedLimit = 8,
): Promise<MclToolEnvelope<{ records: Array<Record<string, unknown>> }>> {
  const limit = Math.min(Math.max(requestedLimit, 1), 12);
  const items = await searchOfficialCatalog(query, "CATMAT");
  const records = items.slice(0, limit).map((item) => ({
    code: item.externalCode,
    description: item.description,
    status: item.status,
    sourceSystem: item.sourceSystem,
    sourceUrl: item.sourceUrl,
    fetchedAt: item.fetchedAt,
    sourceUpdatedAt: item.sourceUpdatedAt,
  }));
  const citations = [...new Map(items.map((item) => [item.sourceUrl, item])).values()]
    .slice(0, 8)
    .map<Citation>((item) => ({
      title: `CATMAT ${item.externalCode}`,
      source: item.sourceSystem,
      url: safeHttpUrl(item.sourceUrl),
      asOf: item.sourceUpdatedAt ?? item.fetchedAt,
      dataNature: "LIVE_OFFICIAL",
    }));
  const asOf = items[0]?.fetchedAt ?? nowIso();

  return {
    status: "AVAILABLE",
    dataNature: "LIVE_OFFICIAL",
    asOf,
    citations,
    gaps: items.length ? [] : ["A consulta oficial retornou zero itens; nenhum CATMAT foi inferido ou fabricado."],
    data: { records },
  };
}
