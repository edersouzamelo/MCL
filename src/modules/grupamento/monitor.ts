import type { CcoLayoutId } from "@/modules/grupamento/cco";

export const GROUP_STORAGE_KEYS = {
  sag: "mcl:grupamento:sag:v1",
  rpn: "mcl:grupamento:rpn:v1",
  rules: "mcl:grupamento:rules:v1",
  monitors: "mcl:grupamento:monitors:v2",
} as const;

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
    delaySeconds: 15,
    layout: layout ?? "mcl",
  }));
}
