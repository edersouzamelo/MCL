import type { TgRow } from "@/modules/credits-tg/parser";

type Deadline = { kind: "EMPENHO" | "RECOLHIMENTO"; date: string; evidence: string; yearInferredFromNc: boolean };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const months: Record<string, number> = { JAN:1, FEV:2, MAR:3, ABR:4, MAI:5, JUN:6, JUL:7, AGO:8, SET:9, OUT:10, NOV:11, DEZ:12 };
const anchor = /(?:PRAZO\s+(?:PARA\s+)?(?:EMPENHO|EMPH)(?:\s+ATE)?|(?:EMPENHO|EMPENHAR|EMPH)\s+(?:(?:IMPRETERIVELMENTE|OBRIGATORIAMENTE)\s+)?ATE|(?:RECOLHER(?:\s+(?:OS\s+)?SALDOS)?|RECOLHIMENTO(?:\s+(?:DO|DE)\s+CREDITO)?)\s+ATE)\s*[:=\-]?\s*(?:DIA\s+)?/g;

/** Only explicit deadline clauses qualify. An issue date or DIEx date does not. */
export function extractNcDeadlines(description: string, nc: string): Deadline[] {
  const normalized = normalize(description);
  const results: Deadline[] = [];
  for (const match of normalized.matchAll(anchor)) {
    const tail = normalized.slice(match.index + match[0].length);
    const numeric = tail.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}|\d{2}))?(?!\d)/);
    const named = numeric ? null : tail.match(/^(\d{1,2})\s*(?:DE\s*)?(JAN(?:EIRO)?|FEV(?:EREIRO)?|MAR(?:CO)?|ABR(?:IL)?|MAI(?:O)?|JUN(?:HO)?|JUL(?:HO)?|AGO(?:STO)?|SET(?:EMBRO)?|OUT(?:UBRO)?|NOV(?:EMBRO)?|DEZ(?:EMBRO)?)\s*(?:(?:DE\s*)?(\d{4}|\d{2}))?(?!\d)/);
    const parsed = numeric ?? named;
    if (!parsed) continue;
    const day = Number(parsed[1]);
    const month = numeric ? Number(parsed[2]) : months[parsed[2].slice(0,3)];
    const yearText = parsed[3] ?? nc.match(/(20\d{2})NC/i)?.[1];
    if (!yearText) continue;
    const year = Number(yearText.length === 2 ? "20"+yearText : yearText);
    const date = new Date(Date.UTC(year,month-1,day));
    if (year < 2000 || year > 2100 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) continue;
    results.push({ kind: /RECOLH/.test(match[0]) ? "RECOLHIMENTO" : "EMPENHO", date: date.toISOString().slice(0,10),
      evidence: description.slice(match.index,match.index+match[0].length+parsed[0].length).trim(), yearInferredFromNc: !parsed[3] });
  }
  return [...new Map(results.map(value => [JSON.stringify(value),value])).values()];
}

export type NcDeadlineQuery = { ug?: string; pi?: string; nd?: string; kind?: "EMPENHO" | "RECOLHIMENTO" | "ALL";
  status?: "TODAY" | "OVERDUE" | "UPCOMING" | "ALL"; offset?: number; limit?: number };

export function localReferenceDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Extract across all matching documents before filtering, sorting and pagination. */
export function queryNcDeadlines(rows: TgRow[], query: NcDeadlineQuery, referenceDay: string) {
  const documents = new Map<string,{ug:string; nc:string; descriptions:Set<string>}>();
  for (const row of rows) {
    if (!row.nc || (query.ug && row.ug !== query.ug) || (query.nd && !row.nd?.startsWith(query.nd)) || (query.pi && !normalize(row.pi ?? "").includes(normalize(query.pi)))) continue;
    const key = row.ug+"|"+row.nc;
    const document = documents.get(key) ?? {ug:row.ug,nc:row.nc,descriptions:new Set<string>()};
    if (row.ncDescription) document.descriptions.add(row.ncDescription);
    documents.set(key,document);
  }
  let withoutRecognizedDeadline = 0;
  const records: Array<Deadline & {ug:string;nc:string;status:"TODAY"|"OVERDUE"|"UPCOMING"}> = [];
  for (const document of documents.values()) {
    const deadlines = [...document.descriptions].flatMap(description => extractNcDeadlines(description,document.nc));
    if (!deadlines.length) withoutRecognizedDeadline++;
    for (const deadline of deadlines) {
      const status = deadline.date === referenceDay ? "TODAY" : deadline.date < referenceDay ? "OVERDUE" : "UPCOMING";
      if (query.kind && query.kind !== "ALL" && deadline.kind !== query.kind) continue;
      if (query.status && query.status !== "ALL" && status !== query.status) continue;
      records.push({...deadline,ug:document.ug,nc:document.nc,status});
    }
  }
  const unique = [...new Map(records.map(record => [JSON.stringify(record),record])).values()]
    .sort((a,b) => a.date.localeCompare(b.date) || a.nc.localeCompare(b.nc));
  const offset = Math.max(0,Math.floor(query.offset ?? 0));
  const limit = Math.min(30,Math.max(1,Math.floor(query.limit ?? 10)));
  return { referenceDay, scannedDocuments: documents.size, withoutRecognizedDeadline, matchedDeadlines: unique.length,
    records:unique.slice(offset,offset+limit), nextOffset:offset+limit < unique.length ? offset+limit : null,
    limitations: ["Prazos são extraídos da descrição da NC; não são sua data de emissão.",
      "Ano omitido só é completado a partir do número da NC e é identificado como inferido.",
      "Sem prazo reconhecido não significa sem prazo: textos livres e prazos relativos podem exigir leitura documental.",
      "Prazo vencido não comprova saldo pendente nem crédito disponível por NC; anulações, recolhimentos e prorrogações exigem conferência."] };
}
