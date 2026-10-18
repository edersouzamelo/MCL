import { z } from "zod";

/**
 * Cognitive Core v1: register module capabilities, not sentence-specific rules.
 * Only an enabled server-side adapter makes a capability queryable.
 */
export type SemanticCapability = {
  id: string;
  version: string;
  title: string;
  domain: string;
  entities: readonly string[];
  measures: Record<string, string>;
  dimensions: readonly string[];
  tool: string;
  provenance: string;
  permission: string;
  description: string;
};

export const creditMeasures = {
  AVAILABLE: "Crédito disponível: provisão atualizada menos empenhado, não se confunde com saldo pago.",
  PROVISION: "Provisão atualizada recebida pelas UG executoras.",
  COMMITTED: "Valor total empenhado no exercício.",
  LIQUIDATED: "Valor dos empenhos já liquidados no exercício.",
  TO_LIQUIDATE: "Parcela dos empenhos ainda a liquidar.",
  PAID: "Valor efetivamente pago no exercício.",
  RPNP_REGISTERED_TOTAL: "Total inscrito mais reinscrito em restos a pagar não processados.",
  RPNP_TO_LIQUIDATE: "RPNP pendentes de liquidação.",
  RPNP_PAID: "RPNP pagos.",
} as const;

export const AI_CAPABILITY_REGISTRY: readonly SemanticCapability[] = [
  {
    id: "credits-tg",
    version: "1.0.0-mvp",
    title: "Créditos e execução orçamentária",
    domain: "Créditos/Tesouro Gerencial",
    entities: ["UG/UASG executora", "Organização Militar", "Nota de Crédito", "Nota de Empenho", "Natureza de Despesa", "Plano Interno"],
    measures: creditMeasures,
    dimensions: ["TOTAL", "UG", "ND", "PI", "NE"],
    tool: "queryTgCreditAnalytics",
    provenance: "Planilha do Tesouro Gerencial persistida, com nome, data da importação e data da fonte",
    permission: "Consulta apenas à organização autenticada; 'nossa OM' exige UASG vinculada",
    description: "Leitura, agrupamento, ranking e divisão auditável de medidas de execução. A projeção TG atual não contém prazo de validade/vencimento das NC e não permite ranking por menor prazo. Valores são centavos inteiros. Não executa importação nem decisões.",
  },
] as const;

export const aiSemanticPlanSchema = z.object({
  capability: z.enum(["credits-tg", "other"]),
  intent: z.enum(["value", "ratio", "breakdown", "ranking", "analysis", "source", "clarify", "nc_validity"]),
  metric: z.enum([
    "AVAILABLE", "PROVISION", "COMMITTED", "LIQUIDATED", "TO_LIQUIDATE", "PAID",
    "RPNP_REGISTERED_TOTAL", "RPNP_TO_LIQUIDATE", "RPNP_PAID",
  ]).nullable(),
  denominator: z.enum(["COMMITTED", "PROVISION"]).nullable(),
  scope: z.enum(["own", "all", "unit", "context"]),
  unit: z.string().trim().max(100).nullable(),
  nd: z.string().trim().max(20).nullable(),
  pi: z.string().trim().max(80).nullable(),
  search: z.string().trim().max(120).nullable(),
  groupBy: z.enum(["TOTAL", "UG", "ND", "PI", "NE"]).nullable(),
  clarification: z.string().trim().max(180).nullable(),
});

export type AiSemanticPlan = z.infer<typeof aiSemanticPlanSchema>;

export function semanticCatalogueForModel() {
  return AI_CAPABILITY_REGISTRY.map(({ id, title, version, entities, measures, dimensions, permission, description }) =>
    ({ id, title, version, entities, measures, dimensions, permission, description }));
}

export function findSemanticCapability(id: string): SemanticCapability | undefined {
  return AI_CAPABILITY_REGISTRY.find((capability) => capability.id === id);
}
