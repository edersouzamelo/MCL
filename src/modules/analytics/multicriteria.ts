import type { MulticriteriaWeights, Need } from "@/modules/domain/types";

export interface MulticriteriaInput {
  need: Need;
  stockCoveragePercent: number;
  daysUntilRequired: number;
  connectorRisk: number;
  financialCoveragePercent: number;
}

export function validateWeights(weights: MulticriteriaWeights) {
  const sum =
    weights.urgency +
    weights.operationalImpact +
    weights.stockRisk +
    weights.logisticsLeadTime +
    weights.financialCoverage;
  if (sum !== 100) {
    throw new Error(`Soma de pesos deve ser 100%; recebido ${sum}%.`);
  }
}

function normalize(value: number, min: number, max: number) {
  if (max === min) {
    return 0;
  }
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function scoreNeed(input: MulticriteriaInput, weights: MulticriteriaWeights) {
  validateWeights(weights);
  const priorityValue = { CRITICA: 1, ALTA: 0.8, MEDIA: 0.5, BAIXA: 0.2 }[input.need.priority];
  const urgency = 1 - normalize(input.daysUntilRequired, 0, 45);
  const stockRisk = 1 - normalize(input.stockCoveragePercent, 0, 100);
  const leadTimeRisk = normalize(input.connectorRisk, 0, 3);
  const financialCoverage = normalize(input.financialCoveragePercent, 0, 100);

  const normalized = {
    urgency: Math.max(0, urgency),
    operationalImpact: priorityValue,
    stockRisk,
    logisticsLeadTime: leadTimeRisk,
    financialCoverage,
  };

  const score =
    normalized.urgency * weights.urgency +
    normalized.operationalImpact * weights.operationalImpact +
    normalized.stockRisk * weights.stockRisk +
    normalized.logisticsLeadTime * weights.logisticsLeadTime +
    normalized.financialCoverage * weights.financialCoverage;

  return {
    score: Math.round(score * 100) / 100,
    normalized,
    formula:
      "score = urgencia*35 + impacto*25 + riscoEstoque*20 + prazoLogistico*10 + coberturaFinanceira*10",
    weightsVersion: weights.version,
    missingData: [] as string[],
  };
}
