export const GROUP_STORAGE_KEYS = {
  sag: "mcl:grupamento:sag:v1",
  rules: "mcl:grupamento:rules:v1",
  monitors: "mcl:grupamento:monitors:v1",
} as const;

export const CCO_SCREEN_CATALOG = [
  { id: "overview", label: "Visão executiva" },
  { id: "execution", label: "Execução orçamentária" },
  { id: "classes", label: "Execução por Classe" },
  { id: "briefing", label: "Modo briefing" },
  { id: "pis", label: "Planos Internos" },
  { id: "units", label: "Organizações / UG" },
  { id: "provenance", label: "Fonte e atualização" },
] as const;

export type CcoScreenId = (typeof CCO_SCREEN_CATALOG)[number]["id"];

export type CcoMonitorConfig = {
  id: number;
  label: string;
  enabled: boolean;
  mode: "single" | "loop";
  screens: CcoScreenId[];
  delaySeconds: number;
};

export function defaultCcoMonitorConfig(): CcoMonitorConfig[] {
  const presets: CcoScreenId[][] = [
    ["overview", "execution"],
    ["classes"],
    ["briefing"],
    ["units"],
    ["overview", "classes", "pis"],
    ["provenance"],
    ["execution", "classes"],
    ["overview", "execution", "classes", "briefing", "pis", "units", "provenance"],
  ];

  return presets.map((screens, index) => ({
    id: index + 1,
    label: `Monitor ${index + 1}`,
    enabled: true,
    mode: screens.length === 1 ? "single" : "loop",
    screens,
    delaySeconds: 15,
  }));
}
