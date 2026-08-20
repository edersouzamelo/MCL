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
  { id: "class-diversas", label: "Classes Diversas" },
  { id: "pis", label: "Planos Internos" },
  { id: "units", label: "Organizações / UG" },
] as const;

export type CcoScreenId = (typeof CCO_SCREEN_CATALOG)[number]["id"];
export type CcoLayout = "mcl" | "ccol";

export type CcoMonitorConfig = {
  id: number;
  label: string;
  enabled: boolean;
  mode: "single" | "loop";
  screens: CcoScreenId[];
  delaySeconds: number;
  layout: CcoLayout;
};

export function defaultCcoMonitorConfig(): CcoMonitorConfig[] {
  const presets: Array<{ screens: CcoScreenId[]; layout: CcoLayout }> = [
    { screens: ["overview", "execution"], layout: "mcl" },
    { screens: ["class-i"], layout: "ccol" },
    { screens: ["class-ii"], layout: "ccol" },
    { screens: ["units"], layout: "mcl" },
    { screens: ["class-iii", "class-v", "class-viii", "class-ix"], layout: "ccol" },
    { screens: ["class-diversas"], layout: "ccol" },
    { screens: ["rpn"], layout: "ccol" },
    { screens: ["overview", "execution", "class-i", "class-ii", "class-iii", "class-v", "class-viii", "class-ix", "class-diversas", "units", "rpn"], layout: "mcl" },
  ];

  return presets.map(({ screens, layout }, index) => ({
    id: index + 1,
    label: `Monitor ${index + 1}`,
    enabled: true,
    mode: screens.length === 1 ? "single" : "loop",
    screens,
    delaySeconds: 15,
    layout,
  }));
}
