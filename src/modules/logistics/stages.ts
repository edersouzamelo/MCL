import type { SourceSystemDomain } from "@/modules/connectors/catalog";

export type LogisticsStageId =
  | "necessidade"
  | "credito"
  | "aquisicao"
  | "recebimento"
  | "armazenagem"
  | "entrega"
  | "manutencao"
  | "recolhimento";

export interface LogisticsStageDefinition {
  id: LogisticsStageId;
  number: string;
  title: string;
  description: string;
  meta: string;
  tone: string;
  glyph: string;
  href: string;
  domain: SourceSystemDomain;
  objective: string;
}

/** Fonte canônica da macroestrutura operacional do MCL. */
export const LOGISTICS_STAGES: readonly LogisticsStageDefinition[] = [
  { id: "necessidade", number: "01", title: "Necessidade", description: "Demanda, déficit, catálogo e prioridade operacional preservados desde a origem.", meta: "Demanda e cobertura", tone: "blue", glyph: "clipboard", href: "/necessidades", domain: "Necessidades", objective: "Registrar e acompanhar a necessidade logística, seu déficit e sua prioridade, mantendo fonte, organização e temporalidade." },
  { id: "credito", number: "02", title: "Crédito", description: "Cobertura orçamentária, saldos e execução financeira associados à demanda.", meta: "Tesouro Gerencial", tone: "mint", glyph: "credit", href: "/creditos", domain: "Orçamento e finanças", objective: "Correlacionar crédito, empenho e situação financeira sem substituir as fontes oficiais de autoridade." },
  { id: "aquisicao", number: "03", title: "Aquisição", description: "CATMAT confirmado, atas, instrumentos e fornecedores vinculados à necessidade.", meta: "CATMAT e instrumentos", tone: "amber", glyph: "cart", href: "/aquisicoes", domain: "Aquisições", objective: "Relacionar a necessidade confirmada aos instrumentos de aquisição e à cobertura contratual disponível." },
  { id: "recebimento", number: "04", title: "Recebimento", description: "Entrada física, documental e fiscal com divergências e evidências registradas.", meta: "QR e conferência", tone: "violet", glyph: "package", href: "/recebimento", domain: "Recebimento", objective: "Registrar a entrada física e suas evidências sem confundir recebimento material, ateste documental e liquidação financeira." },
  { id: "armazenagem", number: "05", title: "Armazenagem", description: "Localização, condição, saldo, reserva e custódia da unidade logística.", meta: "Estoque e endereço", tone: "rose", glyph: "warehouse", href: "/armazenagem", domain: "Estoque / armazém", objective: "Preservar localização, condição e movimentações internas da unidade logística, com referência ao sistema oficial de estoque." },
  { id: "entrega", number: "06", title: "Entrega", description: "Separação, expedição, transporte, destino e confirmação do recebimento final.", meta: "Remessa e destino", tone: "cyan", glyph: "truck", href: "/entrega", domain: "Transporte / distribuição", objective: "Acompanhar a remessa até a confirmação de entrega, preservando origem, destino e eventos intermediários." },
  { id: "manutencao", number: "07", title: "Manutenção", description: "Condição, indisponibilidade, intervenção e retorno do material ao emprego.", meta: "Ciclo de disponibilidade", tone: "orange", glyph: "wrench", href: "/manutencao", domain: "Manutenção", objective: "Estender o passaporte digital ao ciclo de manutenção, sem assumir as competências dos sistemas especializados por classe." },
  { id: "recolhimento", number: "08", title: "Recolhimento", description: "Retorno, transferência, descarga ou destinação com encerramento rastreável.", meta: "Retorno e destinação", tone: "slate", glyph: "return", href: "/recolhimento", domain: "Recolhimento", objective: "Registrar o fluxo reverso e a destinação do material sem apagar sua trajetória anterior." },
] as const;

export function logisticsStageById(id: LogisticsStageId) {
  return LOGISTICS_STAGES.find((stage) => stage.id === id)!;
}
