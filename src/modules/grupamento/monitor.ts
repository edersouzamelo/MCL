import type { CcoLayoutId } from "@/modules/grupamento/cco";

export const GROUP_STORAGE_KEYS = {
  sag: "mcl:grupamento:sag:v1",
  rpn: "mcl:grupamento:rpn:v1",
  rules: "mcl:grupamento:rules:v1",
  monitors: "mcl:grupamento:monitors:v2",
} as const;

export const CCO_DEFAULT_LOOP_DELAY_SECONDS = 10;
export const CCO_DEFAULT_SCROLL_PX_PER_SECOND = 36;
export const CCO_PI_SCROLL_PX_PER_SECOND = 26;
export const CCO_SCROLL_TOP_HOLD_MS = 1_200;
export const CCO_SCROLL_BOTTOM_HOLD_MS = 1_400;
export const CCO_PI_ROWS_PER_PAGE = 11;
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
  { id: "briefing", label: "Resumo das Classes" },
  { id: "pis", label: "Planos Internos" },
  { id: "units-current-160", label: "OM · exercício · série 160" },
  { id: "units-current-167", label: "OM · exercício · série 167" },
  { id: "units-rpn-160", label: "OM · créditos anteriores · série 160" },
  { id: "units-rpn-167", label: "OM · créditos anteriores · série 167" },
] as const;

export type CcoScreenId = (typeof CCO_SCREEN_CATALOG)[number]["id"];

export type CcoMonitorConfig = {
  id: number;
  label: string;
  enabled: boolean;
  mode: "single" | "loop";
  screens: CcoScreenId[];
  delaySeconds: number;
  layout: CcoLayoutId;
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
  ];

  return presets.map(({ screens, layout }, index) => ({
    id: index + 1,
    label: `Monitor ${index + 1}`,
    enabled: true,
    mode: screens.length === 1 ? "single" : "loop",
    screens,
    delaySeconds: CCO_DEFAULT_LOOP_DELAY_SECONDS,
    layout: layout ?? "mcl",
  }));
}
