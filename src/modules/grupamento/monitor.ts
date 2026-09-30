import type { CcoLayoutId } from "@/modules/grupamento/cco";

export const GROUP_STORAGE_KEYS = {
  sag: "mcl:grupamento:sag:v1",
  rpn: "mcl:grupamento:rpn:v1",
  rules: "mcl:grupamento:rules:v1",
} as const;

export const CCO_DEFAULT_LOOP_DELAY_SECONDS = 10;
export const CCO_DEFAULT_SCROLL_PX_PER_SECOND = 36;
export const CCO_PI_SCROLL_PX_PER_SECOND = 26;
export const CCO_SCROLL_TOP_HOLD_MS = 1_200;
export const CCO_SCROLL_BOTTOM_HOLD_MS = 1_400;
export const CCO_PI_ROWS_PER_PAGE = 20;
export const CCO_UNIT_ROWS_PER_PAGE = 10;

export function readableMonitorCycleMs(maxOffset: number, baseSeconds: number, screen: string) {
  const baseMs = Math.max(5, baseSeconds) * 1000;
  if (maxOffset <= 2) return baseMs;

  const pixelsPerSecond = screen === "pis"
    ? CCO_PI_SCROLL_PX_PER_SECOND
    : CCO_DEFAULT_SCROLL_PX_PER_SECOND;
  const travelMs = (maxOffset / pixelsPerSecond) * 1000;

  return Math.max(baseMs, CCO_SCROLL_TOP_HOLD_MS + travelMs + CCO_SCROLL_BOTTOM_HOLD_MS);
}

export const CCO_SCREEN_CATALOG = [
  { id: "overview", label: "Visão executiva" },
  { id: "execution", label: "Exercício Corrente" },
  { id: "rpn", label: "Créditos do exercício anterior" },
  { id: "class-i", label: "Classe I" },
  { id: "class-ii", label: "Classe II" },
  { id: "class-iii", label: "Classe III" },
  { id: "class-v", label: "Classe V" },
  { id: "class-viii", label: "Classe VIII" },
  { id: "class-ix", label: "Classe IX" },
  { id: "class-diversas", label: "Finalidades diversas" },
  { id: "class-i-summary", label: "Classe I - Resumido" },
  { id: "class-ii-summary", label: "Classe II - Resumido" },
  { id: "class-iii-summary", label: "Classe III - Resumido" },
  { id: "class-v-summary", label: "Classe V - Resumido" },
  { id: "class-viii-summary", label: "Classe VIII - Resumido" },
  { id: "class-ix-summary", label: "Classe IX - Resumido" },
  { id: "class-diversas-summary", label: "Finalidades diversas - Resumido" },
  { id: "briefing", label: "Resumo das Classes" },
  { id: "pis", label: "Planos Internos" },
  { id: "units-current-160", label: "OM · exercício · série 160" },
  { id: "units-current-167", label: "OM · exercício · série 167" },
  { id: "units-rpn-160", label: "OM · créditos anteriores · série 160" },
  { id: "units-rpn-167", label: "OM · créditos anteriores · série 167" },
] as const;

export type CcoScreenId = (typeof CCO_SCREEN_CATALOG)[number]["id"];

export const CCO_MONITOR_COUNT = 10;
export const CCO_TEST_MONITOR_ID = 9;
export const CCO_CENTRAL_MONITOR_ID = 10;
export const CCO_RESPONSIBLE_SECTORS = ["Classe I", "Classe II", "Classe III", "Classe V Mun", "Classe V Armt", "Classe VII", "Classe VIII e PASA", "Classe IX", "Seção de Planejamento", "Seção de Transporte"] as const;
export type CcoResponsibleSector = (typeof CCO_RESPONSIBLE_SECTORS)[number];
export function isCcoMonitorId(id: number) { return Number.isInteger(id) && id >= 1 && id <= CCO_MONITOR_COUNT; }
export function ccoLocalDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function monitorUpdatedToday(config: Pick<CcoMonitorConfig, "updatedOn">, now = new Date()) { return config.updatedOn === ccoLocalDate(now); }

export type CcoMonitorConfig = {
  id: number;
  label: string;
  enabled: boolean;
  mode: "single" | "loop";
  screens: CcoScreenId[];
  delaySeconds: number;
  layout: CcoLayoutId;
  responsibleSector?: CcoResponsibleSector | null;
  updatedOn?: string | null;
};

export function defaultCcoMonitorConfig(): CcoMonitorConfig[] {
  const presets: Array<{ screens: CcoScreenId[]; layout?: CcoLayoutId }> = [
    { screens: ["overview", "execution", "rpn"] },
    { screens: ["class-i", "class-ii", "class-iii", "class-v", "class-viii", "class-ix", "class-diversas"] },
    { screens: ["briefing", "class-i", "class-v", "class-ix"], layout: "ccol" },
    { screens: ["units-current-160", "units-current-167"] },
    { screens: ["units-rpn-160", "units-rpn-167"] },
    { screens: ["pis", "overview"] },
    { screens: ["rpn", "class-diversas"] },
    { screens: ["overview", "execution", "class-i", "class-ii", "class-iii", "class-v", "class-viii", "class-ix", "class-diversas", "rpn"] },
    { screens: ["overview"] },
    { screens: [], layout: "briefing" },
  ];

  return presets.map(({ screens, layout }, index) => ({
    id: index + 1,
    label: index === 8 ? "Monitor Teste" : index === 9 ? "Monitor Central" : `Monitor ${index + 1}`,
    enabled: index !== 9,
    mode: screens.length === 1 ? "single" : "loop",
    screens,
    delaySeconds: CCO_DEFAULT_LOOP_DELAY_SECONDS,
    layout: layout ?? "mcl",
    responsibleSector: index === 9 ? "Seção de Planejamento" : null,
    updatedOn: null,
  }));
}

export function parseCcoMonitorConfig(value: unknown, monitorId: number): CcoMonitorConfig | null {
  if (!isCcoMonitorId(monitorId)) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const validScreens = new Set<string>(CCO_SCREEN_CATALOG.map((screen) => screen.id));
  if (item.id !== monitorId || typeof item.label !== "string" || !item.label.trim() || item.label.length > 100 ||
      typeof item.enabled !== "boolean" || (item.mode !== "single" && item.mode !== "loop") ||
      !Array.isArray(item.screens) || item.screens.length > validScreens.size ||
      item.screens.some((screen) => typeof screen !== "string" || !validScreens.has(screen)) ||
      new Set(item.screens).size !== item.screens.length ||
      !Number.isInteger(item.delaySeconds) || (item.delaySeconds as number) < 5 || (item.delaySeconds as number) > 300 ||
      (item.layout !== "mcl" && item.layout !== "ccol" && item.layout !== "briefing") ||
      (item.responsibleSector != null && !(CCO_RESPONSIBLE_SECTORS as readonly unknown[]).includes(item.responsibleSector)) ||
      (item.updatedOn != null && (typeof item.updatedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.updatedOn) || Number.isNaN(Date.parse(item.updatedOn))))) return null;
  return {
    id: monitorId, label: item.label.trim(), enabled: item.enabled, mode: item.mode,
    screens: item.screens as CcoScreenId[], delaySeconds: item.delaySeconds as number, layout: item.layout,
    responsibleSector: item.responsibleSector as CcoResponsibleSector | null | undefined ?? null,
    updatedOn: item.updatedOn as string | null | undefined ?? null,
  };
}

/** Descriptions refer to the actual financial view, including the imported scope. */
export function ccoScreenDescription(screen: CcoScreenId): string {
  if (screen.endsWith("-summary")) return "Visualização do total de recursos recebidos desta classe distribuído por PI";
  if (screen.startsWith("class-")) return "Execução desta classe por finalidade: previsto na matriz, recebido, empenhado, liquidado, saldo disponível e créditos do exercício anterior.";
  switch (screen) {
    case "overview": return "Visão consolidada dos recursos importados: percentuais de empenho e liquidação, saldo disponível, créditos anteriores e OMs com maior volume recebido.";
    case "execution": return "Execução do exercício corrente: crédito recebido, percentuais empenhado e liquidado e distribuição entre disponível, a liquidar, em liquidação, liquidado e pago.";
    case "rpn": return "Créditos do exercício anterior: total inscrito, valores a liquidar, liquidados e cancelados, com seus percentuais.";
    case "briefing": return "Comparação entre as classes: total recebido, percentuais empenhado e liquidado e liquidação dos créditos anteriores, conforme a matriz PI/Classe.";
    case "pis": return "Execução por PI: valor recebido, proporção empenhada e disponível e percentual liquidado. Todos os PIs são exibidos em quadros sucessivos.";
    case "units-current-160": return "Recursos do exercício corrente por OM da série 160: total recebido e percentuais empenhado e liquidado. Todas as OMs são exibidas em quadros sucessivos.";
    case "units-current-167": return "Recursos do exercício corrente por OM da série 167: total recebido e percentuais empenhado e liquidado. Todas as OMs são exibidas em quadros sucessivos.";
    case "units-rpn-160": return "Créditos do exercício anterior por OM da série 160: total inscrito e percentuais liquidado e cancelado. Todas as OMs são exibidas em quadros sucessivos.";
    case "units-rpn-167": return "Créditos do exercício anterior por OM da série 167: total inscrito e percentuais liquidado e cancelado. Todas as OMs são exibidas em quadros sucessivos.";
    default: return "Dados orçamentários da fonte SAG importada.";
  }
}
