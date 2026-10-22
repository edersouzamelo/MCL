import type { TgRow } from "@/modules/credits-tg/parser";
import type { TgSnapshot } from "@/modules/credits-tg/repository";

export const TG_EVIDENCE_FIELDS = [
  "id", "sheet", "sourceRow", "ug", "om", "pi", "piDescription", "action", "actionDescription",
  "fundingSource", "fundingSourceDescription", "responsibleUg", "responsibleUgDescription", "ptres",
  "itemCode", "itemDescription", "nd", "ndDescription", "ne", "year", "supplier", "neDescription",
  "neAdditionalInformation", "biddingModality", "processNumber", "neType", "neDay", "neMonth",
  "nc", "ncDescription", "ncOperation", "ncStatus", "ncDecentralizationType", "ncTransfer",
  "ncYear", "ncDay", "ncMonth", "ro", "roAdditionalInformation", "roWebDocumentType", "roWebDocument",
  "document", "documentObservation", "documentType", "documentTypeDescription", "documentValueCents",
  "documentYear", "documentDay", "documentMonth", "movementCents", "level", "piExplicit", "neExplicit",
] as const satisfies readonly (keyof TgRow)[];
type Field = typeof TG_EVIDENCE_FIELDS[number];
type Filter = { field: Field; operator: "eq" | "contains" | "present"; value?: string | number | boolean | null };
export type TgEvidenceQuery = {
  operation: "schema" | "rows" | "aggregate";
  filters?: Filter[]; fields?: Field[]; groupBy?: Field[];
  offset?: number; limit?: number; sort?: "VALUE_ASC" | "VALUE_DESC";
};
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const present = (value: unknown) => value !== null && value !== undefined && value !== "";

/** Filters and calculations cover the entire authorized snapshot before pagination. */
export function queryTgEvidence(snapshot: TgSnapshot, query: TgEvidenceQuery) {
  const source = { fileName: snapshot.fileName, checksum: snapshot.checksum, importedAt: snapshot.importedAt,
    emailReceivedAt: snapshot.emailReceivedAt, rowCount: snapshot.rows.length };
  for (const field of [...(query.fields ?? []), ...(query.groupBy ?? []), ...(query.filters ?? []).map(f => f.field)]) {
    if (!(TG_EVIDENCE_FIELDS as readonly string[]).includes(field)) throw new Error("Campo TG não autorizado.");
  }
  if (query.operation === "schema") {
    const items = new Map<string, string>();
    const ugs = new Map<string, string>();
    for (const row of snapshot.rows) {
      if (row.itemCode) items.set(row.itemCode, row.itemDescription ?? "");
      ugs.set(row.ug, row.om);
    }
    return { source, fields: TG_EVIDENCE_FIELDS, items: [...items].map(([code, description]) => ({ code, description })),
      units: [...ugs].map(([ug, om]) => ({ ug, om })),
      rules: ["Valores monetários em centavos; cada Item Informação representa uma medida distinta.",
        "Prazo deve vir da descrição documental, não da data de emissão.",
        "NC individualiza provisão; saldo disponível por NC não é demonstrado sem vínculo NC-NE.",
        "Consultas analisam todos os registros; apenas a exibição é paginada."] };
  }
  const rows = snapshot.rows.filter(row => (query.filters ?? []).every(filter => {
    const value = row[filter.field];
    return filter.operator === "present" ? present(value)
      : filter.operator === "contains" ? normalize(value).includes(normalize(filter.value))
      : value === filter.value;
  }));
  const offset = Math.max(0, Math.floor(query.offset ?? 0));
  const limit = Math.min(30, Math.max(1, Math.floor(query.limit ?? 10)));
  if (query.operation === "aggregate") {
    const item = query.filters?.find(f => f.field === "itemCode" && f.operator === "eq" && typeof f.value === "string");
    if (!item) throw new Error("Selecione exatamente um Item Informação antes de somar movimentos.");
    if (item.value === "19" && query.groupBy?.includes("nc")) {
      throw new Error("O Item 19 contém movimentos sem NC; seu agrupamento por NC não comprova saldo disponível individual. Consulte o saldo por UG/PI/ND e os prazos separadamente.");
    }
    const groups = new Map<string, { dimensions: Record<string, unknown>; movementCents: number; rowCount: number }>();
    for (const row of rows) {
      const dimensions = Object.fromEntries((query.groupBy ?? []).map(field => [field, row[field]]));
      const key = JSON.stringify(dimensions);
      const group = groups.get(key) ?? { dimensions, movementCents: 0, rowCount: 0 };
      group.movementCents += row.movementCents; group.rowCount++;
      if (!Number.isSafeInteger(group.movementCents)) throw new Error("Soma fora da precisão suportada.");
      groups.set(key, group);
    }
    const values = [...groups.values()].sort((a,b) => (query.sort === "VALUE_ASC" ? 1 : -1) * (a.movementCents-b.movementCents));
    return { source, scannedRows: snapshot.rows.length, matchedRows: rows.length, totalGroups: values.length,
      totalMovementCents: values.reduce((sum,group) => sum + group.movementCents, 0),
      groups: values.slice(offset,offset+limit), nextOffset: offset+limit < values.length ? offset+limit : null };
  }
  const fields = query.fields?.length ? query.fields : ["id", "ug", "itemCode", "nc", "ncDescription", "ne", "neDescription", "movementCents"] as const;
  return { source, scannedRows: snapshot.rows.length, matchedRows: rows.length,
    records: rows.slice(offset,offset+limit).map(row => Object.fromEntries(fields.map(field => [field,row[field]]))),
    nextOffset: offset+limit < rows.length ? offset+limit : null };
}
