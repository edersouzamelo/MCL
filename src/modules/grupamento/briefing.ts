export const BRIEFING_CLASSES = [
  "Classe I", "Classe II", "Classe III", "Classe V (Armamento)",
  "Classe V (Munição)", "Classe IX", "Classe VIII e PASA", "Seção de Transporte",
] as const;

// Proportions measured from the supplied PowerPoint, in EMU.
export const BRIEFING_SIZE = { width: 13444525, height: 7562850 };
export const BRIEFING_CONTENT = { x: .065, y: .155, w: .915, h: .795 };
export function briefingClass(monitorId: number) { return BRIEFING_CLASSES[monitorId - 1] ?? `Monitor ${monitorId}`; }
export function latestBriefingUpdate(...dates: Array<string | null | undefined>) {
  return dates.filter((v): v is string => Boolean(v)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).at(-1);
}
export function briefingDate(value?: string | null) {
  if (!value) return "Atualização não informada";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-04:00` : value);
  if (Number.isNaN(date.getTime())) return "Atualização não informada";
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "short", year: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `Atualizado em ${get("day")} ${get("month").replace(".", "").toUpperCase()} ${get("year")}`;
}
