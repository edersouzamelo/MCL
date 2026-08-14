import type { AcquisitionInstrument, ArpUnitRecord } from "@/modules/domain/types";

export type MulticriteriaFactorScore = {
  score: number;
  maxScore: number;
  label: string;
  explanation: string;
};

export type MulticriteriaScoreResult = {
  totalScore: number; // 0 to 100
  tier: "ALTAMENTE_RECOMENDADA" | "RECOMENDADA" | "VIÁVEL" | "RESTRIÇÃO_LEGAL";
  tierBadgeColor: string;
  factors: {
    price: MulticriteriaFactorScore;
    balance: MulticriteriaFactorScore;
    validity: MulticriteriaFactorScore;
    priority: MulticriteriaFactorScore;
  };
};

export const DEFAULT_USER_UASG = "160136"; // Cmdo 9º Gpt Log

export function calculateArpMulticriteriaScore(
  instrument: AcquisitionInstrument,
  deficit: number,
  unitRecords: ArpUnitRecord[] = [],
  minPriceInSet?: number,
  userUasg: string = DEFAULT_USER_UASG,
): MulticriteriaScoreResult {
  // 1. Fator Preço (0 a 35 pts)
  let priceScore = 35;
  let priceExplanation = "Valor unitário não informado.";
  const unitValue = instrument.unitValue ? Number(instrument.unitValue) : undefined;

  if (unitValue && unitValue > 0) {
    const basePrice = minPriceInSet && minPriceInSet > 0 ? minPriceInSet : unitValue;
    if (unitValue <= basePrice) {
      priceScore = 35;
      priceExplanation = `Menor valor unitário encontrado (R$ ${unitValue.toFixed(2)}). Pontuação máxima dada (35/35 pts).`;
    } else {
      const ratio = basePrice / unitValue;
      priceScore = Math.max(5, Math.round(ratio * 35));
      priceExplanation = `Valor unitário R$ ${unitValue.toFixed(2)} vs Menor oferta R$ ${basePrice.toFixed(2)} (${Math.round(ratio * 100)}% da melhor oferta: ${priceScore}/35 pts).`;
    }
  }

  // 2. Fator Saldo de Adesão Legal (0 a 30 pts)
  let balanceScore = 0;
  let balanceExplanation = "Consulta de saldo pendente.";
  
  const relevantRecord = unitRecords.find(
    (r) => r.acquisitionInstrumentId === instrument.id || r.numeroAta === instrument.externalReference
  ) || unitRecords[0];

  if (relevantRecord) {
    if (!relevantRecord.aceitaAdesao) {
      balanceScore = 0;
      balanceExplanation = "VEDAÇÃO LEGAL: A UG Gerenciadora optou por não aceitar adesões externas (Art. 86 da Lei 14.133/2021). (0/30 pts).";
    } else {
      const saldoAdesoes = relevantRecord.saldoAdesoes ?? 0;
      const quantidadeRegistrada = relevantRecord.quantidadeRegistrada ?? 0;
      // Trava legal individual da sua OM = 50% do item (Art. 86 § 4º)
      const maxAdesaoIndividual = Math.floor(quantidadeRegistrada * 0.5);
      const limiteRealAdesao = Math.min(saldoAdesoes, maxAdesaoIndividual);

      if (limiteRealAdesao >= deficit && deficit > 0) {
        balanceScore = 30;
        balanceExplanation = `Saldo legal disponível para a sua OM (${limiteRealAdesao} un) COBRE INTEGRALMENTE o déficit de ${deficit} un. Pontuação máxima (30/30 pts).`;
      } else if (limiteRealAdesao > 0 && deficit > 0) {
        const pct = limiteRealAdesao / deficit;
        balanceScore = Math.max(5, Math.round(pct * 30));
        balanceExplanation = `Saldo legal disponível para a sua OM (${limiteRealAdesao} un) cobre ${Math.round(pct * 100)}% do déficit de ${deficit} un (${balanceScore}/30 pts).`;
      } else {
        balanceScore = 0;
        balanceExplanation = `Saldo de adesão esgotado ou indisponível (0 un). (0/30 pts).`;
      }
    }
  } else {
    // Se não há registros de unidades ainda consultadas, atribuir score estimado pela capacidade da ata
    const capacity = instrument.capacity || Number(instrument.quantity || 0);
    if (capacity >= deficit && deficit > 0) {
      balanceScore = 20;
      balanceExplanation = `Capacidade homologada da Ata (${capacity} un) atende ao déficit (${deficit} un). Estimativa pré-consulta UGs (20/30 pts).`;
    } else if (capacity > 0 && deficit > 0) {
      balanceScore = 10;
      balanceExplanation = `Capacidade homologada da Ata (${capacity} un) atende parcialmente ao déficit (${deficit} un). (10/30 pts).`;
    } else {
      balanceScore = 0;
      balanceExplanation = "Capacidade ou saldo zerado.";
    }
  }

  // 3. Fator Vigência / Prazo Restante (0 a 20 pts)
  let validityScore = 0;
  let validityExplanation = "Vigência expirada ou não informada.";
  const now = Date.now();
  const validUntilMs = instrument.validUntil ? new Date(instrument.validUntil).getTime() : 0;

  if (validUntilMs > now) {
    const remainingDays = Math.ceil((validUntilMs - now) / (1000 * 60 * 60 * 24));
    if (remainingDays >= 180) {
      validityScore = 20;
      validityExplanation = `Vigência ampla: ${remainingDays} dias restantes até a expiração. Pontuação máxima (20/20 pts).`;
    } else if (remainingDays >= 90) {
      validityScore = 15;
      validityExplanation = `Vigência adequada: ${remainingDays} dias restantes. (15/20 pts).`;
    } else if (remainingDays >= 30) {
      validityScore = 10;
      validityExplanation = `Vigência mediana: ${remainingDays} dias restantes. Atenção ao prazo de empenho. (10/20 pts).`;
    } else {
      validityScore = 5;
      validityExplanation = `Vigência crítica: apenas ${remainingDays} dias restantes! Risco de expiração antes da concessão. (5/20 pts).`;
    }
  } else if (instrument.status === "VIGENTE" || instrument.status === "PUBLICO_COLETADO") {
    validityScore = 10;
    validityExplanation = `Ata coletada da fonte oficial em período recente. Vigência estimada (10/20 pts).`;
  }

  // 4. Fator Prioridade Lógica Institucional / UASG (0 a 15 pts)
  let priorityScore = 5;
  let priorityExplanation = "3ª Prioridade: Carona Brasil (UG Externa / Estadual / Outro Órgão). (5/15 pts).";

  const ataUasg = relevantRecord?.unidadeGerenciadora || (instrument as any).organizationId || instrument.organizationCode || "";

  if (ataUasg === userUasg || ataUasg.includes(userUasg)) {
    priorityScore = 15;
    priorityExplanation = `1ª PRIORIDADE LEGAL: Ata Própria da sua UASG (${userUasg} - Cmdo 9º Gpt Log). Pontuação máxima (15/15 pts).`;
  } else if (relevantRecord?.tipoUnidade === "PARTICIPANTE" || ataUasg.startsWith("160")) {
    priorityScore = 10;
    priorityExplanation = `2ª PRIORIDADE: UG Subordinada ou Vinculada ao Comando Logístico / Exército. (10/15 pts).`;
  }

  const totalScore = priceScore + balanceScore + validityScore + priorityScore;

  let tier: MulticriteriaScoreResult["tier"] = "RESTRIÇÃO_LEGAL";
  let tierBadgeColor = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";

  if (totalScore >= 80) {
    tier = "ALTAMENTE_RECOMENDADA";
    tierBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
  } else if (totalScore >= 60) {
    tier = "RECOMENDADA";
    tierBadgeColor = "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300";
  } else if (totalScore >= 40) {
    tier = "VIÁVEL";
    tierBadgeColor = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return {
    totalScore,
    tier,
    tierBadgeColor,
    factors: {
      price: { score: priceScore, maxScore: 35, label: "Fator Preço Unitário", explanation: priceExplanation },
      balance: { score: balanceScore, maxScore: 30, label: "Fator Saldo de Adesão Legal", explanation: balanceExplanation },
      validity: { score: validityScore, maxScore: 20, label: "Fator Vigência / Prazo Restante", explanation: validityExplanation },
      priority: { score: priorityScore, maxScore: 15, label: "Fator Prioridade Institucional", explanation: priorityExplanation },
    },
  };
}
