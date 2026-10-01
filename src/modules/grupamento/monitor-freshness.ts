const zone = "America/Cuiaba";
const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
function day(date: Date) {
  const parts = calendar.formatToParts(date);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"));
}
export function monitorUpdateAge(updatedAt?: string | null, now = new Date()): number | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.max(0, Math.round((day(now) - day(date)) / 86400000));
}
export function monitorFreshness(age: number | null) {
  if (age === null) return { hue: null, label: "Sem atualização registrada", border: "#94a3b8", background: "#94a3b81a" };
  const hue = Math.max(0, 120 * (1 - age / 7));
  return { hue, label: age === 0 ? "Atualizado hoje" : age === 1 ? "Há 1 dia" : `Há ${age} dias`, border: `hsl(${hue} 75% 38%)`, background: `hsl(${hue} 75% 50% / 0.12)` };
}
export function monitorUpdateTime(value: string) { return new Date(value).toLocaleString("pt-BR", { timeZone: zone, dateStyle: "short", timeStyle: "medium" }); }

export type SagFreshnessSource = { referenceDate?: string; importedAt: string; fileName?: string };
export function sagSourceFreshness(source?: SagFreshnessSource | null, now = new Date()) {
  const reference = source?.referenceDate;
  const referenceInstant = reference && /^\d{4}-\d{2}-\d{2}$/.test(reference) ? `${reference}T12:00:00-04:00` : reference;
  const referenceAge = monitorUpdateAge(referenceInstant, now);
  const basis = referenceAge !== null ? "reference" : "import";
  const date = basis === "reference" ? referenceInstant : source?.importedAt;
  const age = monitorUpdateAge(date, now);
  return { age, date: age === null ? undefined : date, basis };
}
export function sagPairFreshness(current?: SagFreshnessSource | null, rpn?: SagFreshnessSource | null, now = new Date()) {
  const sources = [sagSourceFreshness(current,now), sagSourceFreshness(rpn,now)];
  const complete = Boolean(current && rpn);
  const age = complete && sources.every(source => source.age !== null) ? Math.max(...sources.map(source => source.age!)) : null;
  return { age, complete, sources };
}
